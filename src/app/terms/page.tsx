import LegalPage, { legalMetadata } from "@/components/LegalPage";
import { LEGAL_PLACEHOLDERS as P } from "@/lib/legal";
import Link from "next/link";

export const metadata = legalMetadata(
  "Terms of Use",
  "Draft terms of use for the FamousDukaan marketplace. Pending legal review.",
  "/terms",
);

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use">
      <p>
        These draft terms describe the use of FamousDukaan, an online marketplace operated by {P.businessLegalName},
        {P.registeredAddress}, GSTIN {P.gstin}. By using the website you agree to use it lawfully and in line with these
        terms, once they are finalised.
      </p>
      <p>
        Products are listed and sold by independent vendors. The marketplace provides the website, checkout, and related
        tools. Product descriptions, stock, country of origin, and seller details appear on the product page and are
        provided by or on behalf of the seller. Prices are displayed in Indian rupees (INR).
      </p>
      <p>
        Orders are confirmed after payment is verified. Unpaid orders may expire. Returns, refunds, and shipping are
        described in the <Link href="/refund-policy" className="underline">Refund Policy</Link> and{" "}
        <Link href="/shipping-policy" className="underline">Shipping Policy</Link>. If something goes wrong, contact {P.supportEmail} or the grievance officer named on the <Link href="/grievance" className="underline">Grievance</Link> page.
      </p>
      <p>
        We may update these terms after legal review. This draft is not a complete contract and is not legal advice.
      </p>
    </LegalPage>
  );
}
