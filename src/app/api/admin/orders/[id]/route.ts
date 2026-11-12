import { NextResponse } from "next/server";
import type { FulfillmentStatus } from "@prisma/client";
import { requireApiRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { cancelOrderInTransaction, syncOrderStatus } from "@/lib/inventory";

const FULFILLMENT_STATUSES: FulfillmentStatus[] = [
  "AWAITING_PAYMENT",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

function timestampsFor(status: FulfillmentStatus) {
  const now = new Date();
  if (status === "PACKED") return { packedAt: now };
  if (status === "SHIPPED") return { shippedAt: now };
  if (status === "DELIVERED") return { deliveredAt: now };
  return {};
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireApiRole(["ADMIN"]);
  if (error || !session) return error;
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const payload = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const action = String(payload.action || "").toLowerCase();

  const order = await prisma.order.findUnique({ where: { id }, include: { fulfillments: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (action === "cancel") {
    const result = await prisma.$transaction((tx) =>
      cancelOrderInTransaction(tx, id, {
        createdById: session.user.id,
        reason: payload.reason ? String(payload.reason).slice(0, 200) : "Cancelled by admin",
      })
    );
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, order: result.order, skippedShipped: result.skippedShipped });
  }

  if (action === "refund") {
    if (order.paymentStatus !== "PAID") {
      return NextResponse.json({ error: "Only paid orders can be marked refunded" }, { status: 409 });
    }
    const updated = await prisma.order.update({
      where: { id },
      data: { refundMarkedAt: new Date() },
    });
    return NextResponse.json({ success: true, order: updated });
  }

  if (action === "override") {
    const fulfillmentId = String(payload.fulfillmentId || "");
    const status = String(payload.status || "") as FulfillmentStatus;
    const trackingNumber = payload.trackingNumber != null ? String(payload.trackingNumber).trim() : undefined;
    if (!fulfillmentId || !FULFILLMENT_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Provide fulfillmentId and a valid status" }, { status: 400 });
    }
    const fulfillment = order.fulfillments.find((f) => f.id === fulfillmentId);
    if (!fulfillment) return NextResponse.json({ error: "Fulfillment not found" }, { status: 404 });
    if (status === "SHIPPED" && !(trackingNumber || fulfillment.trackingNumber)) {
      return NextResponse.json({ error: "A tracking number is required to mark shipped" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.orderFulfillment.update({
        where: { id: fulfillmentId },
        data: {
          status,
          ...(trackingNumber ? { trackingNumber } : {}),
          ...timestampsFor(status),
        },
      });
      await syncOrderStatus(tx, id);
      return tx.order.findUnique({
        where: { id },
        include: {
          fulfillments: { include: { vendor: { select: { storeName: true } } } },
        },
      });
    });
    return NextResponse.json({ success: true, order: updated });
  }

  return NextResponse.json({ error: "Action must be cancel, refund, or override" }, { status: 400 });
}
