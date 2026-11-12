import LegalPage, { legalMetadata } from "@/components/LegalPage";
import { LEGAL_PLACEHOLDERS as P } from "@/lib/legal";
import Link from "next/link";

export const metadata = legalMetadata(
  "Privacy Policy",
  "Draft privacy information for the FamousDukaan marketplace. Pending legal review.",
  "/privacy",
);

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This draft explains, in general terms, how FamousDukaan handles personal information when you use the website, in
        line with the Digital Personal Data Protection Act, 2023 (DPDP Act) and other applicable law. The operator of the
        site, and the person responsible for this processing, is {P.businessLegalName}, {P.registeredAddress}.
      </p>
      <p>
        We collect information you provide when you create an account, apply to sell, place or track an order, write a
        review, or contact us. This can include your name, email address, phone number, shipping details, and payment
        references such as a UTR for UPI transfers. If you apply as a seller, we also collect shop, pickup, PAN, optional
        GSTIN, and bank details needed to review your application and, if approved, to operate your shop. We use this
        information only for stated purposes: to operate the marketplace, create and manage accounts, take and fulfil
        orders, prevent misuse and fraud, handle reviews and grievances, and meet legal and tax record-keeping duties.
      </p>
      <p>
        We process this information because it is needed to provide the service you asked for (for example, an account or
        an order), or because a law requires us to keep it. We do not use your information for marketing or profiling
        unless you have clearly asked us to. You may withdraw consent for any optional processing by emailing{" "}
        {P.supportEmail}. Withdrawal does not affect processing we must continue in order to complete an order or keep
        records the law requires.
      </p>
      <p>
        Payment is completed through UPI or other methods described at checkout. We do not ask you to share your UPI PIN
        or full card details on this website. We do not sell your personal information. Vendors receive only the order
        details they need to pack and ship items you bought from them. We may share information with professional
        advisers or authorities where the law requires it, or with service providers who host or operate this website on
        our instructions.
      </p>
      <p>
        We keep account, order, and related records for as long as needed to fulfil the order, handle disputes, and meet
        legal and tax record-keeping duties. When we no longer need the information for those purposes, we delete it or
        keep it only in a form that no longer identifies you, unless a law requires us to retain it for longer.
      </p>
      <p>
        Under the DPDP Act, you may request access to the personal data we hold about you, correction of inaccurate data,
        erasure where that is allowed, and information about how we process it. You may also raise a data-related
        grievance with us. To make a request, email {P.supportEmail} or contact the grievance officer named on the{" "}
        <Link href="/grievance" className="underline">Grievance</Link> page. We may need to verify your identity before
        we respond.
      </p>
      <p>
        FamousDukaan is intended for users aged 18 years or older. We do not knowingly collect personal data of children.
        If you believe we have collected personal data of a child, please write to {P.supportEmail} so that we can delete
        it where the law requires.
      </p>
      <p>
        This draft will be completed after legal review and is not a comprehensive privacy notice or a substitute for
        advice on the DPDP Act.
      </p>
    </LegalPage>
  );
}
