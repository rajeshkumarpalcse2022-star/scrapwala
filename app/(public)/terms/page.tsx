import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { SITE_URL, SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY } from "@/lib/constants/site";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Read the terms and conditions that apply when you use the ScrapWala website and book a doorstep scrap pickup.",
  alternates: { canonical: `${SITE_URL}/terms` },
};

export default function TermsPage() {
  return (
    <LegalPage
      id="terms"
      title="Terms & Conditions"
      summary="Welcome to ScrapWala. By accessing our website or using our scrap pickup services, you agree to these Terms & Conditions. Please read them carefully before placing a pickup request."
      effectiveDate="25 October 2026"
    >
      <h2>1. About Our Services</h2>
      <p>
        ScrapWala provides an online platform through which customers can submit requests for scrap
        collection. Depending on service availability, customers may select scrap categories,
        provide estimated quantities, submit pickup details, and request a collection.
      </p>
      <p>
        A submitted pickup request is not a guarantee of immediate collection or confirmation of a
        specific collection time.
      </p>

      <h2>2. Pickup Requests and Confirmation</h2>
      <p>
        Customers must provide accurate contact details, pickup addresses, and information about
        the scrap materials.
      </p>
      <p>
        After a pickup request is submitted, the ScrapWala team may review the request and arrange
        an appropriate collector, subject to service availability.
      </p>
      <p>
        Pickup schedules may change because of operational requirements, location constraints,
        weather, or other circumstances beyond reasonable control. We will make reasonable efforts
        to communicate relevant changes.
      </p>

      <h2>3. Scrap Categories and Rates</h2>
      <p>
        Rates displayed on the website are indicative rates and may vary by material type, quality,
        condition, contamination, and other applicable factors.
      </p>
      <p>
        The final scrap value will be determined using the actual measured weight and the
        applicable rate confirmed at collection.
      </p>
      <p>
        If the actual material differs materially from the information supplied during booking, the
        final value may change. Customers may review the applicable calculation before accepting
        the transaction.
      </p>

      <h2>4. Weighing and Final Value</h2>
      <p>
        The final amount is calculated using the accepted weight and applicable rate for the
        relevant scrap material.
      </p>
      <p>
        Customers should be allowed to verify the weighing and final calculation before the
        transaction is completed.
      </p>

      <h2>5. Payments</h2>
      <p>
        Where online payments are enabled, transactions may be processed through Razorpay or
        another authorized payment provider.
      </p>
      <p>
        Customers must provide accurate payment details through the payment provider&apos;s secure
        interface. Payment confirmation is subject to successful processing and verification.
      </p>
      <p>
        Any payment collection, service charge, or other fee must be disclosed to the customer
        before payment.
      </p>

      <h2>6. Cancellation and Refunds</h2>
      <p>
        Pickup cancellation, payment refunds, and failed transactions will be handled according to
        the <a href="/cancellation-refund">Cancellation &amp; Refund Policy</a> published on our
        website.
      </p>
      <p>
        Any applicable refund will be processed subject to the circumstances of the transaction,
        the relevant payment provider&apos;s procedures, and applicable law.
      </p>

      <h2>7. Customer Responsibilities</h2>
      <p>Customers agree to:</p>
      <ul>
        <li>Provide accurate information when submitting pickup requests.</li>
        <li>
          Ensure that the materials offered for collection are lawfully possessed and available for
          collection.
        </li>
        <li>Provide safe and reasonable access to the pickup location.</li>
        <li>Cooperate with the collector during material inspection, weighing, and transaction confirmation.</li>
        <li>Avoid submitting fraudulent, misleading, or abusive requests.</li>
      </ul>

      <h2>8. Service Availability</h2>
      <p>
        ScrapWala may modify, suspend, or discontinue any part of its services when reasonably
        necessary for maintenance, operational requirements, security, or legal compliance.
      </p>

      <h2>9. Limitation of Liability</h2>
      <p>
        To the extent permitted by applicable law, ScrapWala will not be responsible for indirect
        losses arising from temporary service interruptions, inaccurate information supplied by
        customers, or circumstances outside its reasonable control.
      </p>
      <p>
        Nothing in these Terms excludes or limits liability where such exclusion or limitation is
        prohibited by applicable law.
      </p>

      <h2>10. Intellectual Property</h2>
      <p>
        Website content, branding, designs, graphics, and software elements belonging to ScrapWala
        may not be copied, reproduced, or commercially used without appropriate authorization,
        except where permitted by law.
      </p>

      <h2>11. Changes to These Terms</h2>
      <p>
        We may update these Terms &amp; Conditions from time to time. Changes will be published on
        this page with a revised effective date.
      </p>

      <h2>12. Governing Law</h2>
      <p>
        These Terms are subject to the applicable laws of India. Disputes will be handled by the
        competent courts or forums in accordance with applicable law.
      </p>

      <h2>13. Contact Us</h2>
      <p>For questions about these Terms, please contact ScrapWala:</p>
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
