import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { expireUnpaidOrdersSafe } from "@/lib/inventory";
import { phoneLast4, publicTimeline } from "@/lib/shipping";

export async function GET(request: Request) {
  await expireUnpaidOrdersSafe();
  const url = new URL(request.url);
  const orderNo = String(url.searchParams.get("orderNo") || "").trim();
  const last4 = String(url.searchParams.get("phoneLast4") || "").replace(/\D/g, "").slice(-4);
  if (!orderNo) {
    return NextResponse.json({ error: "Enter an order number" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { orderNo },
    include: {
      fulfillments: {
        include: {
          vendor: { select: { storeName: true } },
          items: { include: { product: { select: { name: true } } } },
        },
      },
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const session = await getAuthSession();
  const isOwner = Boolean(session?.user && (session.user.id === order.userId || session.user.role === "ADMIN"));
  const expected = phoneLast4(order.shippingAddress);
  if (!isOwner) {
    if (!last4 || !expected || last4 !== expected) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
  }

  return NextResponse.json({
    order: {
      orderNo: order.orderNo,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      cancelledAt: order.cancelledAt,
      fulfillments: order.fulfillments.map((f) => ({
        vendorName: f.vendor.storeName,
        status: f.status,
        trackingNumber: f.trackingNumber,
        items: f.items.map((item) => ({ name: item.product.name, quantity: item.quantity })),
        timeline: publicTimeline(order.paymentStatus, order.createdAt, order.paidAt, f),
      })),
    },
  });
}
