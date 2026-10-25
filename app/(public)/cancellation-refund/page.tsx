import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { SITE_URL, SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY } from "@/lib/constants/site";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy",
  description:
    "Learn how ScrapWala handles pickup cancellations, failed or duplicate payments, refund eligibility and refund processing timelines.",
  alternates: { canonical: `${SITE_URL}/cancellation-refund` },
};

export default function CancellationRefundPage() {
  return (
    <LegalPage
      id="cancellation-refund"
      title="Cancellation & Refund Policy"
      summary="This policy explains how pickup cancellations, payment failures, and refund requests are handled on ScrapWala."
      effectiveDate="25 October 2026"
    >
      <h2>1. Cancellation Before Pickup</h2>
      <p>
        Customers who wish to cancel a pickup request should contact ScrapWala as early as possible
        using the contact details provided on our website.
      </p>
      <p>
        A pickup request may be cancelled before collection, subject to its current status and any
        applicable terms disclosed at the time of booking.
      </p>

      <h2>2. Cancellation by ScrapWala</h2>
      <p>
        ScrapWala may cancel or reschedule a pickup if the location is not serviceable, the
        customer cannot be contacted, the materials are materially different from the booking
        details, or operational circumstances prevent collection.
      </p>
      <p>
        Where an online payment has already been collected for a service that is cancelled, the
        refund will be assessed according to the transaction circumstances and applicable law.
      </p>

      <h2>3. Failed or Duplicate Payments</h2>
      <p>
        If an online payment fails but the amount is debited from the customer&apos;s account, the
        customer should contact ScrapWala with the transaction reference and relevant details.
      </p>
      <p>
        Duplicate or incorrectly processed payments will be investigated and, where verified,
        refunded through the appropriate payment channel.
      </p>

      <h2>4. Refund Eligibility</h2>
      <p>Refund eligibility depends on the nature of the payment and the status of the transaction.</p>
      <ul>
        <li>
          <strong>Payment for a cancelled service:</strong> Reviewed according to the circumstances
          and applicable law.
        </li>
        <li>
          <strong>Failed transaction:</strong> Handled after payment status verification.
        </li>
        <li>
          <strong>Duplicate payment:</strong> Reviewed and refunded where the duplicate charge is
          confirmed.
        </li>
        <li>
          <strong>Completed scrap collection:</strong> The final scrap value is determined by the
          accepted weight and applicable rate. Any dispute should be reported promptly for review.
        </li>
      </ul>

      <h2>5. Refund Processing Time</h2>
      <p>
        Approved refunds will be initiated within a reasonable period and in accordance with the
        payment provider&apos;s procedures and applicable requirements. The time taken for the
        amount to appear in the customer&apos;s account may depend on the bank, payment method, and
        payment provider.
      </p>

      <h2>6. How to Request a Refund</h2>
      <p>Please contact ScrapWala and provide:</p>
      <ul>
        <li>Your name and registered contact number.</li>
        <li>Pickup request ID, if available.</li>
        <li>Payment transaction reference, if applicable.</li>
        <li>A brief description of the issue.</li>
      </ul>
      <blockquote>
        Do not share your UPI PIN, card CVV, password, or other confidential authentication
        information with anyone.
      </blockquote>

      <h2>7. Contact Us</h2>
      <p>For cancellation or refund assistance, please contact ScrapWala:</p>
      <ul>
        <li>
          <strong>Website:</strong>{" "}
          <a href={SITE_URL} target="_blank" rel="noopener noreferrer">
            {SITE_URL.replace(/^https?:\/\//, "")}
          </a>
        </li>
        <li>
          <strong>Email:</strong>{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </li>
        <li>
          <strong>Phone:</strong> {SUPPORT_PHONE_DISPLAY}
        </li>
      </ul>
    </LegalPage>
  );
}
