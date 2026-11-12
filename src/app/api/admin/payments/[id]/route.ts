import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

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

  const updated = await prisma.order.update({
    where: { id },
    data:
      action === "paid"
        ? {
            paymentStatus: "PAID",
            status: "CONFIRMED",
            paidAt: new Date(),
            verifiedById: session.user.id,
          }
        : {
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

  return NextResponse.json({ success: true, order: updated });
}
