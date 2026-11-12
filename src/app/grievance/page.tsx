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
        FamousDukaan provides a grievance officer so that you can raise concerns about orders, listings, personal data,
        or the use of this marketplace. This draft is written with the Consumer Protection (E-Commerce) Rules, 2020, the
        Information Technology Act, 2000, and the Information Technology (Intermediary Guidelines and Digital Media
        Ethics Code) Rules, 2021 in mind, and will be confirmed after legal review.
      </p>
      <ul className="list-none space-y-2">
        <li>Grievance officer: {P.grievanceOfficerName}</li>
        <li>Email: {P.grievanceOfficerEmail}</li>
        <li>Phone: {P.grievanceOfficerPhone}</li>
        <li>Postal address: {P.registeredAddress}</li>
        <li>Marketplace operator: {P.businessLegalName}</li>
        <li>GSTIN: {P.gstin}</li>
      </ul>
      <p>
        To raise a grievance, write to the officer with your name, contact details, order number if you have one, and a
        clear description of the concern. You may also email {P.supportEmail}.
      </p>
      <p>
        For consumer grievances about the marketplace or an order, we aim to acknowledge the complaint within 48 hours of
        receipt and to redress it within one month of receipt, as provided under the Consumer Protection (E-Commerce)
        Rules, 2020.
      </p>
      <p>
        For complaints that relate to FamousDukaan&apos;s role as an intermediary under the Information Technology Act,
        2000 and the Intermediary Guidelines, 2021, we aim to acknowledge the complaint within 24 hours and to resolve it
        within 15 days of receipt.
      </p>
      <p>
        These timelines will be followed in the way the applicable rules require, once this draft is finalised. If a
        complaint falls under more than one framework, we will apply the timeline that the law requires for that
        complaint.
      </p>
    </LegalPage>
  );
}
