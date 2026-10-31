import { NextRequest } from "next/server";
import connectDB from "@/lib/db/mongoose";
import HiringPayment from "@/models/HiringPayment";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

/**
 * Razorpay webhook receiver (`payment.captured` / `order.paid`).
 *
 * The client-side checkout callback is the primary confirmation path, so this
 * endpoint is a reliability net: it marks a payment "paid" even when the
 * applicant closes the browser before the application POST reaches us.
 * Configure it in the Razorpay dashboard as
 * `https://<your-domain>/api/payments/webhook` with RAZORPAY_WEBHOOK_SECRET.
 */
interface WebhookPaymentEntity {
  id?: string;
  order_id?: string;
  amount?: number;
}

interface WebhookPayload {
  event?: string;
  payload?: {
    payment?: {
      entity?: WebhookPaymentEntity;
    };
  };
}

/** Webhook events that confirm money actually moved. */
const PAID_EVENTS = new Set(["payment.captured", "order.paid"]);

export async function POST(request: NextRequest) {
  try {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      return errorResponse("Webhooks are not configured", [], 503);
    }

    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") ?? "";
    if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
      return errorResponse("Invalid webhook signature", [], 400);
    }

    let parsed: WebhookPayload;
    try {
      parsed = JSON.parse(rawBody) as WebhookPayload;
    } catch {
      return errorResponse("Invalid webhook payload", [], 400);
    }

    // Events that confirm money actually moved. Anything else (failed,
    // refunded, …) must never flip a record to "paid".
    if (!parsed?.event || !PAID_EVENTS.has(parsed.event)) {
      return successResponse("Webhook received", { handled: false });
    }

    const entity = parsed?.payload?.payment?.entity;
    if (!entity?.order_id) {
      return successResponse("Webhook received", { handled: false });
    }

    await connectDB();
    const payment = await HiringPayment.findOne({
      razorpayOrderId: entity.order_id,
    });
    if (!payment) {
      // Unknown order — never leak details; just acknowledge.
      return successResponse("Webhook received", { handled: false });
    }

    // A captured amount that differs from the order is suspicious — fail the
    // record loudly instead of silently accepting a wrong charge.
    if (
      typeof entity.amount === "number" &&
      entity.amount !== payment.amount
    ) {
      payment.status = "failed";
      payment.failureReason = `Amount mismatch (webhook captured ${entity.amount} paise, order was ${payment.amount} paise)`;
      await payment.save();
      return successResponse("Webhook received", { handled: true });
    }

    if (payment.status !== "paid") {
      payment.status = "paid";
      if (entity.id) payment.razorpayPaymentId = entity.id;
      payment.paidAt = new Date();
      await payment.save();
    }

    return successResponse("Webhook received", { handled: true });
  } catch (error) {
    console.error("Razorpay webhook failed:", error);
    // 500s make Razorpay retry the event, which is the desired behaviour
    // for transient database problems.
    return errorResponse("Failed to process webhook", [], 500);
  }
}
