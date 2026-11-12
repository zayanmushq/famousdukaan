import LegalPage, { legalMetadata } from "@/components/LegalPage";
import { LEGAL_PLACEHOLDERS as P } from "@/lib/legal";
import Link from "next/link";

export const metadata = legalMetadata(
  "Shipping Policy",
  "Draft shipping information for FamousDukaan. Pending legal review.",
  "/shipping-policy",
);

export default function ShippingPolicyPage() {
  return (
    <LegalPage title="Shipping Policy">
      <p>
        Items sold on FamousDukaan are packed and dispatched by the selling vendor. The product page shows the country of
        origin and indicative shipping or delivery guidance where it is available. Actual times can vary by destination,
        stock, and the seller. We do not promise a fixed delivery time for every product or pin code.
      </p>
      <p>
        When an order is shipped, a tracking number may be provided where the seller has one. You can look up an order
        with the order number and the tools on this website. Risk in the goods and responsibility for delivery follow
        applicable law and the terms that will be finalised after legal review.
      </p>
      <p>
        If a shipment is delayed, incomplete, damaged in transit, or does not arrive, contact {P.supportEmail} with the
        order number, or see the <Link href="/refund-policy" className="underline">Refund Policy</Link> and{" "}
        <Link href="/grievance" className="underline">Grievance</Link> pages. A refund, replacement, or other remedy may
        be available after the issue is reviewed.
      </p>
    </LegalPage>
  );
}
