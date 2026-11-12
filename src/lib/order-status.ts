export function paymentLabel(paymentStatus: string, status: string): string {
  if (status === "CANCELLED") return "Cancelled";
  if (paymentStatus === "PAID") {
    if (status === "DELIVERED") return "Delivered";
    if (status === "PARTIALLY_DELIVERED") return "Partially delivered";
    if (status === "SHIPPED") return "Shipped";
    if (status === "PARTIALLY_SHIPPED") return "Partially shipped";
    if (status === "PACKED") return "Packed";
    if (status === "CONFIRMED") return "Paid — confirmed";
    if (status === "RETURNED") return "Returned";
    return "Paid";
  }
  if (paymentStatus === "SUBMITTED") return "Payment submitted — pending verification";
  if (paymentStatus === "REJECTED") return "Payment rejected";
  if (status === "PENDING_PAYMENT" || paymentStatus === "PENDING") return "Awaiting payment";
  return status.replaceAll("_", " ");
}

export function fulfillmentLabel(status: string): string {
  switch (status) {
    case "AWAITING_PAYMENT":
      return "Awaiting payment";
    case "CONFIRMED":
      return "Confirmed";
    case "PACKED":
      return "Packed";
    case "SHIPPED":
      return "Shipped";
    case "DELIVERED":
      return "Delivered";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status.replaceAll("_", " ");
  }
}

export const FULFILLMENT_TIMELINE: { status: string; label: string }[] = [
  { status: "PLACED", label: "Order placed" },
  { status: "CONFIRMED", label: "Confirmed" },
  { status: "PACKED", label: "Packed" },
  { status: "SHIPPED", label: "Shipped" },
  { status: "DELIVERED", label: "Delivered" },
];
