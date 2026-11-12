import LegalPage, { legalMetadata } from "@/components/LegalPage";
import { LEGAL_PLACEHOLDERS as P } from "@/lib/legal";

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
        Prices on the storefront are shown in Indian rupees (INR).
      </p>
      <p>
        The legal entity that operates this website is {P.businessLegalName}, with its registered address at {P.registeredAddress}.
        Goods and Services Tax identification number (GSTIN): {P.gstin}.
      </p>
      <p>
        For questions about the marketplace, please use the details on our Contact and Grievance pages. Vendor and product
        information is provided by the relevant seller and should be read together with the product page.
      </p>
    </LegalPage>
  );
}
