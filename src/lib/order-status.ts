export function paymentLabel(paymentStatus: string, status: string): string {
  if (paymentStatus === "PAID") return "Paid";
  if (paymentStatus === "SUBMITTED") return "Payment submitted — pending verification";
  if (paymentStatus === "REJECTED") return "Payment rejected";
  if (status === "PENDING_PAYMENT" || paymentStatus === "PENDING") return "Awaiting payment";
  return status.replaceAll("_", " ");
}
