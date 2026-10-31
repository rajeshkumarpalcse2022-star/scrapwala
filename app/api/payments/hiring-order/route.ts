import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { hiringPaymentOrderSchema } from "@/lib/validations/hiring";
import { createHiringPaymentOrder } from "@/services/hiring";
import { successResponse } from "@/lib/utils/api-response";
import { hiringRouteError } from "@/lib/utils/hiring-route-error";

/**
 * Creates a Razorpay order for a published form's application fee.
 *
 * Called by the public application page right before Razorpay Checkout opens.
 * The returned orderId + keyId are the only things the browser needs — the
 * secret never leaves the server.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole("user");
    const body = await request.json();
    const data = hiringPaymentOrderSchema.parse(body);

    const order = await createHiringPaymentOrder({
      slug: data.slug,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userPhone: user.phone,
    });

    return successResponse("Payment initiated", { order }, 200);
  } catch (error: unknown) {
    return hiringRouteError(error, "Failed to start the payment");
  }
}
