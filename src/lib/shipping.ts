export function phoneLast4(shippingAddress: unknown): string | null {
  if (!shippingAddress || typeof shippingAddress !== "object") return null;
  const phone = String((shippingAddress as { phone?: unknown }).phone || "");
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return null;
  return digits.slice(-4);
}

export function publicTimeline(
  paymentStatus: string,
  createdAt: Date,
  paidAt: Date | null,
  fulfillment: {
    status: string;
    packedAt: Date | null;
    shippedAt: Date | null;
    deliveredAt: Date | null;
    trackingNumber: string | null;
  }
) {
  const confirmed = paymentStatus === "PAID" || ["CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"].includes(fulfillment.status);
  const packed = ["PACKED", "SHIPPED", "DELIVERED"].includes(fulfillment.status);
  const shipped = ["SHIPPED", "DELIVERED"].includes(fulfillment.status);
  const delivered = fulfillment.status === "DELIVERED";
  return [
    { key: "PLACED", label: "Order placed", done: true, at: createdAt.toISOString() },
    { key: "CONFIRMED", label: "Confirmed", done: confirmed, at: paidAt?.toISOString() || null },
    { key: "PACKED", label: "Packed", done: packed, at: fulfillment.packedAt?.toISOString() || null },
    {
      key: "SHIPPED",
      label: fulfillment.trackingNumber ? `Shipped · ${fulfillment.trackingNumber}` : "Shipped",
      done: shipped,
      at: fulfillment.shippedAt?.toISOString() || null,
    },
    { key: "DELIVERED", label: "Delivered", done: delivered, at: fulfillment.deliveredAt?.toISOString() || null },
  ];
}
