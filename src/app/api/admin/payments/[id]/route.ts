import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { rollupOrderStatus } from "@/lib/inventory";

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
  const action = String((body as { action?: unknown })?.action || "").toLowerCase();
  if (action !== "paid" && action !== "reject") {
    return NextResponse.json({ error: "Action must be paid or reject" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.paymentStatus === "PAID") {
    return NextResponse.json({ error: "This order is already marked paid" }, { status: 409 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (action === "paid") {
      await tx.orderFulfillment.updateMany({
        where: { orderId: id, status: "AWAITING_PAYMENT" },
        data: { status: "CONFIRMED" },
      });
      const fulfillments = await tx.orderFulfillment.findMany({
        where: { orderId: id },
        select: { status: true },
      });
      return tx.order.update({
        where: { id },
        data: {
          paymentStatus: "PAID",
          status: rollupOrderStatus("PAID", fulfillments, order.cancelledAt),
          paidAt: new Date(),
          verifiedById: session.user.id,
        },
        select: {
          id: true,
          orderNo: true,
          paymentStatus: true,
          status: true,
          paidAt: true,
          verifiedById: true,
          upiTxnRef: true,
        },
      });
    }

    // Reject keeps the stock reservation so the customer can submit another UTR.
    return tx.order.update({
      where: { id },
      data: {
        paymentStatus: "REJECTED",
        status: "PENDING_PAYMENT",
        paidAt: null,
        verifiedById: session.user.id,
      },
      select: {
        id: true,
        orderNo: true,
        paymentStatus: true,
        status: true,
        paidAt: true,
        verifiedById: true,
        upiTxnRef: true,
      },
    });
  });

  return NextResponse.json({ success: true, order: updated });
}
