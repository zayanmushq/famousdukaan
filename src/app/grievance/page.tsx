import LegalPage, { legalMetadata } from "@/components/LegalPage";
import { LEGAL_PLACEHOLDERS as P } from "@/lib/legal";

export const metadata = legalMetadata(
  "Grievance Officer",
  "Draft grievance officer details and process for FamousDukaan. Pending legal review.",
  "/grievance",
);

export default function GrievancePage() {
  return (
    <LegalPage title="Grievance Redressal">
      <p>
        FamousDukaan provides a grievance officer so that consumers can raise concerns about orders, listings, or the
        use of this marketplace, in line with the Consumer Protection (E-commerce) Rules, 2020.
      </p>
      <ul className="list-none space-y-2">
        <li>Grievance officer: {P.grievanceOfficerName}</li>
        <li>Email: {P.grievanceOfficerEmail}</li>
        <li>Phone: {P.grievanceOfficerPhone}</li>
        <li>Postal address: {P.registeredAddress}</li>
        <li>Marketplace operator: {P.businessLegalName}, GSTIN {P.gstin}</li>
      </ul>
      <p>
        To raise a grievance, write to the officer with your name, contact details, order number if you have one, and a
        clear description of the concern. You may also email {P.supportEmail}. We intend to acknowledge and address
        grievances within the timelines required by the Consumer Protection (E-commerce) Rules, 2020, once this draft is
        finalised.
      </p>
    </LegalPage>
  );
}
