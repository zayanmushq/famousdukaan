import LegalPage, { legalMetadata } from "@/components/LegalPage";
import { LEGAL_PLACEHOLDERS as P } from "@/lib/legal";
import Link from "next/link";

export const metadata = legalMetadata(
  "Refund Policy",
  "Draft return and refund information for FamousDukaan. Pending legal review.",
  "/refund-policy",
);

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund and Return Policy">
      <p>
        This draft describes, in general terms, how returns and refunds may work on FamousDukaan. It does not replace
        rights you have under applicable Indian consumer law.
      </p>
      <p>
        If an item is damaged, not as described, or otherwise not acceptable under applicable law, contact {P.supportEmail}
        with your order number and a short description of the issue. We or the seller may ask for photographs or other
        reasonable information. Approved refunds are processed after the request is reviewed. The method and timing of
        any refund will be confirmed in writing, usually using the original payment method where that is practical.
      </p>
      <p>
        Some products may have additional conditions, which will be shown on the product page once those details are
        provided. This draft does not set a specific return window yet; that period will be published here after legal
        review. For a complaint, you may also use the <Link href="/grievance" className="underline">Grievance</Link> process.
      </p>
    </LegalPage>
  );
}
