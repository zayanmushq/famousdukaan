import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { buildUpiUri, UPI_PAYEE_ID, UPI_PAYEE_NAME } from "@/lib/upi";

function canAccess(userId: string, role: string, orderUserId: string) {
  return role === "ADMIN" || userId === orderUserId;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireApiSession();
  if (error || !session) return error;

  const { id } = await context.params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { id: true, name: true, images: true } } } },
      user: { select: { id: true, email: true, name: true } },
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (!canAccess(session.user.id, session.user.role, order.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const upiUri = buildUpiUri(order.total, order.orderNo);
  return NextResponse.json({
    order: {
      id: order.id,
      orderNo: order.orderNo,
      total: order.total,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      upiTxnRef: order.upiTxnRef,
      paidAt: order.paidAt,
      shippingAddress: order.shippingAddress,
      items: order.items,
      createdAt: order.createdAt,
    },
    upi: {
      payeeId: UPI_PAYEE_ID,
      payeeName: UPI_PAYEE_NAME,
      uri: upiUri,
    },
  });
}
