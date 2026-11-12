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
        {P.registeredAddress}. GSTIN: {P.gstin} Together with the{" "}
        <Link href="/privacy" className="underline">Privacy Policy</Link> and the other policies linked from this
        website, they are the rules and user agreement for the platform. By using the website you agree to use it
        lawfully and in line with these terms, once they are finalised.
      </p>
      <p>
        Products are listed and sold by independent vendors. FamousDukaan provides the website, checkout, and related
        tools, and acts as a marketplace operator and, where applicable, an intermediary. Product descriptions, stock,
        country of origin, and seller details appear on the product page and are provided by or on behalf of the seller.
        The selling store name is shown on the product page and on invoice information. We do not warrant that every
        listing is complete or error-free; if something is wrong, contact {P.supportEmail}.
      </p>
      <p>
        Prices are displayed in Indian rupees (INR). The price shown for a product is the selling price at which it is
        offered at that time. An MRP or compare-at price is shown only when the seller has provided one. We do not
        manipulate prices or display a fictitious discount. Prices may change, but an order is charged at the selling
        price confirmed at checkout after payment is verified.
      </p>
      <p>
        Orders are confirmed after payment is verified. Unpaid orders may expire or may be cancelled by the customer
        through the order tools on this website, or by writing to {P.supportEmail}, before payment is verified. After
        payment is verified, a cancellation request can be sent to {P.supportEmail} with the order number. Whether a
        paid order can be cancelled or refunded depends on its fulfilment status (for example, whether it has been packed
        or shipped) and on applicable law, including your rights under Indian consumer law. Shipping, returns, refunds,
        and exchanges are described in the <Link href="/refund-policy" className="underline">Refund Policy</Link> and{" "}
        <Link href="/shipping-policy" className="underline">Shipping Policy</Link>.
      </p>
      <p>
        You must provide accurate information, not misuse the website, and not post unlawful, misleading, or infringing
        content. We may suspend or close an account, or remove a listing, where we reasonably believe these terms or the
        law have been broken. Vendors must only list products they are permitted to sell and must not mislead customers
        about quality, price, or origin.
      </p>
      <p>
        If something goes wrong, contact {P.supportEmail} or the grievance officer named on the{" "}
        <Link href="/grievance" className="underline">Grievance</Link> page. We may update these terms after legal
        review. This draft is not a complete contract and is not legal advice.
      </p>
    </LegalPage>
  );
}
