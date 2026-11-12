import LegalPage, { legalMetadata } from "@/components/LegalPage";
import { LEGAL_PLACEHOLDERS as P } from "@/lib/legal";

export const metadata = legalMetadata(
  "Privacy Policy",
  "Draft privacy information for the FamousDukaan marketplace. Pending legal review.",
  "/privacy",
);

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This draft explains, in general terms, how FamousDukaan may handle information when you use the website. The
        operator of the site is {P.businessLegalName}, {P.registeredAddress}.
      </p>
      <p>
        We may collect information you provide when you create an account, place or track an order, or contact us. This can
        include your name, email address, shipping details, and payment references such as a UTR for UPI transfers. We use
        this information to operate the marketplace, fulfil orders, prevent misuse, and meet legal duties.
      </p>
      <p>
        Payment to vendors is completed through UPI or other methods described at checkout. We do not ask you to share
        your UPI PIN on this website. We do not sell your personal information. Vendors may receive the order details they
        need to pack and ship items you bought from them.
      </p>
      <p>
        You may ask about the information we hold, or request a correction or deletion, by emailing {P.supportEmail}.
        Some records may need to be kept where the law requires it. This draft will be completed after legal review and
        is not a comprehensive privacy notice.
      </p>
    </LegalPage>
  );
}
