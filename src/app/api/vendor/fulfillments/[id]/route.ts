import { NextResponse } from "next/server";
import type { FulfillmentStatus } from "@prisma/client";
import { requireApiRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { syncOrderStatus } from "@/lib/inventory";

const NEXT_STEP: Record<string, FulfillmentStatus> = {
  pack: "PACKED",
  ship: "SHIPPED",
  deliver: "DELIVERED",
};

const REQUIRED_FROM: Record<FulfillmentStatus, FulfillmentStatus> = {
  AWAITING_PAYMENT: "AWAITING_PAYMENT",
  CONFIRMED: "CONFIRMED",
  PACKED: "CONFIRMED",
  SHIPPED: "PACKED",
  DELIVERED: "SHIPPED",
  CANCELLED: "CANCELLED",
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireApiRole(["VENDOR", "ADMIN"]);
  if (error || !session) return error;
  if (session.user.role === "VENDOR" && session.user.vendorStatus !== "APPROVED") {
    return NextResponse.json({ error: "Store must be approved before fulfilling orders" }, { status: 403 });
  }

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const payload = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const action = String(payload.action || "").toLowerCase();
  const next = NEXT_STEP[action];
  if (!next) {
    return NextResponse.json({ error: "Action must be pack, ship, or deliver" }, { status: 400 });
  }

  const fulfillment = await prisma.orderFulfillment.findUnique({
    where: { id },
    include: { order: { select: { id: true, paymentStatus: true } } },
  });
  if (!fulfillment) return NextResponse.json({ error: "Fulfillment not found" }, { status: 404 });
  if (session.user.role !== "ADMIN" && fulfillment.vendorId !== session.user.vendorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (fulfillment.order.paymentStatus !== "PAID") {
    return NextResponse.json({ error: "Fulfillment can start only after the order is paid" }, { status: 409 });
  }
  if (fulfillment.status !== REQUIRED_FROM[next]) {
    return NextResponse.json({ error: `Cannot mark ${next.toLowerCase()} from ${fulfillment.status}` }, { status: 409 });
  }

  const trackingNumber = payload.trackingNumber != null ? String(payload.trackingNumber).trim() : fulfillment.trackingNumber;
  if (next === "SHIPPED" && !trackingNumber) {
    return NextResponse.json({ error: "A tracking number is required to mark shipped" }, { status: 400 });
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.orderFulfillment.update({
      where: { id },
      data: {
        status: next,
        trackingNumber: trackingNumber || fulfillment.trackingNumber,
        ...(next === "PACKED" ? { packedAt: now } : {}),
        ...(next === "SHIPPED" ? { shippedAt: now } : {}),
        ...(next === "DELIVERED" ? { deliveredAt: now } : {}),
      },
    });
    await syncOrderStatus(tx, fulfillment.order.id);
    return row;
  });

  return NextResponse.json({ success: true, fulfillment: updated });
}
