import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { SITE_URL, SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY } from "@/lib/constants/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Read how ScrapWala collects, uses, stores and protects your personal information when you use our website and doorstep scrap pickup services.",
  alternates: { canonical: `${SITE_URL}/privacy-policy` },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      id="privacy-policy"
      title="Privacy Policy"
      summary="ScrapWala (“we,” “our,” or “us”) respects your privacy and is committed to protecting the personal information you share with us through our website and services."
      effectiveDate="25 October 2026"
    >
      <h2>1. Information We Collect</h2>
      <p>When you use ScrapWala, we may collect the following information:</p>
      <ul>
        <li>
          <strong>Personal Information:</strong> Full name, mobile number, WhatsApp number, and
          email address.
        </li>
        <li>
          <strong>Pickup Information:</strong> Pickup address, city, state, PIN code, and location
          details required to arrange scrap collection.
        </li>
        <li>
          <strong>Scrap Details:</strong> Scrap categories, estimated weight, uploaded photographs,
          and other details you provide about the materials for collection.
        </li>
        <li>
          <strong>Payment Information:</strong> Payment status, transaction reference, and
          payment-related records necessary to process and verify transactions.
        </li>
        <li>
          <strong>Technical Information:</strong> Browser information, device information, IP
          address, and website usage data, where applicable.
        </li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <p>We use the information collected to:</p>
      <ul>
        <li>Create and manage scrap pickup requests.</li>
        <li>Contact customers regarding pickup confirmation, scheduling, and collection.</li>
        <li>Assign pickup requests to appropriate collection personnel.</li>
        <li>
          Provide estimated scrap rates and calculate the final value based on actual weighing and
          applicable rates.
        </li>
        <li>Process and verify payments and refunds, where applicable.</li>
        <li>Respond to customer enquiries, callback requests, and complaints.</li>
        <li>Improve website functionality, security, and customer experience.</li>
        <li>Comply with applicable legal and regulatory requirements.</li>
      </ul>

      <h2>3. Location Information</h2>
      <p>
        If you choose to use the current-location feature, your browser may request permission to
        access your device&apos;s location. Location information is used to assist with pickup
        address identification and service coordination. You may enter your address manually
        instead.
      </p>

      <h2>4. Payments and Third-Party Services</h2>
      <p>
        Payments, when enabled, may be processed through Razorpay or another payment service
        provider. Payment processing is subject to the applicable provider&apos;s terms and privacy
        policy.
      </p>
      <p>
        ScrapWala does not intend to store complete card numbers, CVV numbers, UPI PINs, or banking
        passwords on its own servers.
      </p>
      <p>
        We may also use third-party services, such as Cloudinary, to securely manage images and
        documents where applicable.
      </p>

      <h2>5. Sharing of Information</h2>
      <p>
        We may share relevant information with authorized collection personnel, payment service
        providers, technology service providers, and other parties when necessary to provide our
        services, protect our rights, or comply with legal obligations.
      </p>
      <p>We do not sell customers&apos; personal information to third parties.</p>

      <h2>6. Data Security and Retention</h2>
      <p>
        We take reasonable technical and organizational measures to protect personal information
        against unauthorized access, alteration, disclosure, or destruction.
      </p>
      <p>
        We retain information only for as long as reasonably necessary for service delivery,
        business records, dispute resolution, and applicable legal requirements.
      </p>

      <h2>7. Cookies and Website Technologies</h2>
      <p>
        Our website may use cookies or similar technologies for essential functionality, security,
        and performance. Where required, we will provide appropriate notice and choices.
      </p>

      <h2>8. Your Rights</h2>
      <p>
        Subject to applicable law, you may request access to, correction of, or deletion of your
        personal information. Certain records may need to be retained where legally required.
      </p>

      <h2>9. Children&apos;s Privacy</h2>
      <p>
        ScrapWala&apos;s services are intended for individuals legally able to use the service. We
        do not knowingly collect personal information from children in violation of applicable law.
      </p>

      <h2>10. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. The updated version will be published
        on this page with a revised effective date.
      </p>

      <h2>11. Contact Us</h2>
      <p>For privacy-related questions or requests, please contact ScrapWala:</p>
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
