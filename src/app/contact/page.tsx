import LegalPage, { legalMetadata } from "@/components/LegalPage";
import { LEGAL_PLACEHOLDERS as P } from "@/lib/legal";
import Link from "next/link";

export const metadata = legalMetadata(
  "Contact",
  "Contact details for FamousDukaan customer support and the grievance officer. Draft information only.",
  "/contact",
);

export default function ContactPage() {
  return (
    <LegalPage title="Contact">
      <p>
        Use the details below to reach the marketplace. This page does not include a contact form and does not send email
        from the website.
      </p>
      <ul className="list-none space-y-2">
        <li>Marketplace operator: {P.businessLegalName}</li>
        <li>Registered address: {P.registeredAddress}</li>
        <li>GSTIN: {P.gstin}</li>
        <li>Support email: {P.supportEmail}</li>
      </ul>
      <p>
        Grievance officer: {P.grievanceOfficerName}. Email: {P.grievanceOfficerEmail}. Phone: {P.grievanceOfficerPhone}.
        See the <Link href="/grievance" className="underline">Grievance</Link> page for how to raise a concern and the
        acknowledgement and redressal timelines we aim to follow.
      </p>
    </LegalPage>
  );
}
