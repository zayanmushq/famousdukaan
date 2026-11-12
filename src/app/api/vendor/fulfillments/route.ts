import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { expireUnpaidOrdersSafe } from "@/lib/inventory";

export async function GET() {
  const { session, error } = await requireApiRole(["VENDOR", "ADMIN"]);
  if (error || !session) return error;
  if (session.user.role === "VENDOR" && !session.user.vendorId) {
    return NextResponse.json({ error: "Vendor profile not found" }, { status: 403 });
  }

  await expireUnpaidOrdersSafe();

  const fulfillments = await prisma.orderFulfillment.findMany({
    where: session.user.role === "ADMIN" && !session.user.vendorId
      ? undefined
      : { vendorId: session.user.vendorId! },
    include: {
      order: {
        select: {
          id: true,
          orderNo: true,
          paymentStatus: true,
          status: true,
          createdAt: true,
          paidAt: true,
          shippingAddress: true,
        },
      },
      items: { include: { product: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const sanitized = fulfillments.map((row) => {
    const address = row.order.shippingAddress as { name?: string; city?: string; pincode?: string } | null;
    return {
      id: row.id,
      status: row.status,
      trackingNumber: row.trackingNumber,
      packedAt: row.packedAt,
      shippedAt: row.shippedAt,
      deliveredAt: row.deliveredAt,
      createdAt: row.createdAt,
      items: row.items,
      order: {
        id: row.order.id,
        orderNo: row.order.orderNo,
        paymentStatus: row.order.paymentStatus,
        status: row.order.status,
        createdAt: row.order.createdAt,
        paidAt: row.order.paidAt,
        customerName: address?.name || "Customer",
        city: address?.city || "",
        pincode: address?.pincode || "",
      },
    };
  });

  return NextResponse.json({ fulfillments: sanitized, vendorStatus: session.user.vendorStatus });
}
