import crypto from "crypto";
import { ApiError } from "@/lib/utils/api-error";

/**
 * Server-side Razorpay helper (Orders API + signature verification).
 *
 * Kept dependency-free on purpose: the Razorpay REST API is two endpoints for
 * this flow and HMAC-SHA256 verification is native in Node's crypto module.
 * Every function throws an ApiError with a customer-safe message so route
 * handlers can surface them through the normal error mapping.
 *
 * Required env for a paid form to work:
 *   RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET — order creation + signature checks
 *   RAZORPAY_WEBHOOK_SECRET (optional) — webhook signature checks
 */

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

export interface RazorpayOrder {
  id: string;
  /** Amount in paise, as returned by the gateway. */
  amount: number;
  currency: string;
  status: string;
}

function credentials(): { keyId: string; keySecret: string } | null {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return { keyId: keyId.trim(), keySecret: keySecret.trim() };
}

export function isRazorpayConfigured(): boolean {
  return credentials() !== null;
}

function authHeader(): string {
  const creds = credentials();
  if (!creds) {
    throw new ApiError(
      503,
      "Online payments are not configured yet. Please contact support.",
      "PAYMENTS_NOT_CONFIGURED"
    );
  }
  return `Basic ${Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString("base64")}`;
}

export function getRazorpayKeyId(): string {
  const creds = credentials();
  if (!creds) {
    throw new ApiError(
      503,
      "Online payments are not configured yet. Please contact support.",
      "PAYMENTS_NOT_CONFIGURED"
    );
  }
  return creds.keyId;
}

/** Creates a Razorpay order for the exact charge amount (in paise). */
export async function createRazorpayOrder(params: {
  amountInPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const rawBody = JSON.stringify({
    amount: params.amountInPaise,
    currency: "INR",
    receipt: params.receipt,
    notes: params.notes ?? {},
  });

  let response: Response;
  try {
    response = await fetch(`${RAZORPAY_API_BASE}/orders`, {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
      },
      body: rawBody,
    });
  } catch {
    throw new ApiError(
      502,
      "Payment gateway is unreachable right now. Please try again.",
      "PAYMENT_GATEWAY_UNREACHABLE"
    );
  }

  const json = (await response.json().catch(() => null)) as {
    id?: string;
    amount?: number;
    currency?: string;
    status?: string;
  } | null;

  if (!response.ok || !json?.id || typeof json.amount !== "number") {
    throw new ApiError(
      502,
      "Payment gateway rejected this order. Please try again.",
      "PAYMENT_GATEWAY_ERROR"
    );
  }

  return {
    id: json.id,
    amount: json.amount,
    currency: json.currency ?? "INR",
    status: json.status ?? "created",
  };
}

function signaturesMatch(expected: string, received: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received.trim(), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Verifies the Razorpay Checkout success callback:
 * signature = HMAC_SHA256(`${orderId}|${paymentId}`, key_secret).
 */
export function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const creds = credentials();
  if (!creds) return false;
  const expected = crypto
    .createHmac("sha256", creds.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return signaturesMatch(expected, signature);
}

/**
 * Verifies a Razorpay webhook: signature = HMAC_SHA256(raw request body,
 * webhook_secret) sent in the `x-razorpay-signature` header.
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return signaturesMatch(expected, signature);
}
