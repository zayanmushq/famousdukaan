import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireApiSession } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { isValidUtr } from "@/lib/upi";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireApiSession();
  if (error || !session) return error;

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const utr = String((body as { utr?: unknown })?.utr || "").trim();
  if (!isValidUtr(utr)) {
    return NextResponse.json({ error: "UTR must be a 12-digit number" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (session.user.role !== "ADMIN" && session.user.id !== order.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (order.cancelledAt || order.status === "CANCELLED") {
    return NextResponse.json({ error: "This order has been cancelled" }, { status: 409 });
  }
  if (order.paymentStatus === "PAID") {
    return NextResponse.json({ error: "This order is already paid" }, { status: 409 });
  }
  if (order.paymentStatus === "SUBMITTED") {
    return NextResponse.json({ error: "A UTR has already been submitted for this order" }, { status: 409 });
  }

  try {
    const updated = await prisma.order.update({
      where: { id },
      data: {
        upiTxnRef: utr,
        paymentStatus: "SUBMITTED",
      },
      select: {
        id: true,
        orderNo: true,
        paymentStatus: true,
        upiTxnRef: true,
        status: true,
      },
    });
    return NextResponse.json({ success: true, order: updated });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "This UTR has already been used" }, { status: 409 });
    }
    throw err;
  }
}
