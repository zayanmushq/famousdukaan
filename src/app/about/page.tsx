import LegalPage, { legalMetadata } from "@/components/LegalPage";
import { LEGAL_PLACEHOLDERS as P } from "@/lib/legal";
import Link from "next/link";

export const metadata = legalMetadata(
  "About",
  "About FamousDukaan, the marketplace operator, and this draft company information.",
  "/about",
);

export default function AboutPage() {
  return (
    <LegalPage title="About FamousDukaan">
      <p>
        FamousDukaan is an online marketplace where independent vendors can list and sell products to customers in India.
        Prices on the storefront are shown in Indian rupees (INR). The marketplace is operated from India.
      </p>
      <p>
        The legal entity that operates this website is {P.businessLegalName}, with its registered address at {P.registeredAddress}.
        GSTIN: {P.gstin}
      </p>
      <p>
        Each product page shows the selling store name, marketplace operator details, and the country of origin (as provided
        for that product, or India as the marketplace operating country where a product-specific origin has not been given).
        Product descriptions, stock, and seller information are provided by or on behalf of the relevant seller.
      </p>
      <p>
        For questions about the marketplace, use the details on our <Link href="/contact" className="underline">Contact</Link> and{" "}
        <Link href="/grievance" className="underline">Grievance</Link> pages. Also see our{" "}
        <Link href="/terms" className="underline">Terms of Use</Link>,{" "}
        <Link href="/privacy" className="underline">Privacy Policy</Link>,{" "}
        <Link href="/refund-policy" className="underline">Refund Policy</Link>, and{" "}
        <Link href="/shipping-policy" className="underline">Shipping Policy</Link>.
      </p>
    </LegalPage>
  );
}
