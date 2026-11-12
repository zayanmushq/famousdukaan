import LegalPage, { legalMetadata } from "@/components/LegalPage";
import { LEGAL_PLACEHOLDERS as P } from "@/lib/legal";
import Link from "next/link";

export const metadata = legalMetadata(
  "Refund Policy",
  "Draft return, refund, and exchange information for FamousDukaan. Pending legal review.",
  "/refund-policy",
);

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund, Return, and Exchange Policy">
      <p>
        This draft describes, in general terms, how cancellations, returns, refunds, and exchanges may work on
        FamousDukaan. It does not replace rights you have under applicable Indian consumer law.
      </p>
      <p>
        Unpaid orders may be cancelled by the customer before payment is verified, using the order tools on this website
        or by emailing {P.supportEmail} with the order number. After payment is verified, you may ask to cancel by
        writing to the same address. If the item has not yet been packed or shipped, we or the seller will usually try to
        stop dispatch. If the item has already been shipped or delivered, a cancellation may not be possible, and a
        return, exchange, or refund will be considered under this policy and applicable law instead.
      </p>
      <p>
        If an item is damaged, defective, not as described, incomplete, or otherwise not acceptable under applicable law,
        contact {P.supportEmail} with your order number and a short description of the issue. You may request a refund,
        a replacement (exchange), or a repair where that is reasonably available from the seller. We or the seller may
        ask for photographs or other reasonable information. Approved refunds are initiated after the request is
        reviewed. We will confirm in writing when a refund has been initiated. Refunds are usually sent by the original
        payment method (for example, back to the UPI account used at checkout) where that is practical. The time a refund
        then takes to appear depends on the bank, UPI app, or payment service, which is outside our control.
      </p>
      <p>
        This draft does not yet set a single fixed return window for every product. Statutory rights under Indian consumer
        law still apply. A specific return or exchange period, and any product-specific conditions, will be published here
        and on the product page after legal review, and should be in place before the marketplace takes regular customer
        orders. For a complaint, you may also use the <Link href="/grievance" className="underline">Grievance</Link> process.
      </p>
    </LegalPage>
  );
}
