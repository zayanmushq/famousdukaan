import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { cancelOrderInTransaction } from "@/lib/inventory";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireApiSession();
  if (error || !session) return error;
  const { id } = await context.params;

  let reason: string | undefined;
  try {
    const body = await request.json() as { reason?: unknown };
    if (body.reason) reason = String(body.reason).slice(0, 200);
  } catch {
    // optional body
  }

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (session.user.role !== "ADMIN" && session.user.id !== order.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (order.paymentStatus === "PAID") {
    return NextResponse.json({ error: "Paid orders can only be cancelled by an admin" }, { status: 409 });
  }

  const result = await prisma.$transaction((tx) =>
    cancelOrderInTransaction(tx, id, {
      createdById: session.user.id,
      reason: reason || "Cancelled by customer",
    })
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ success: true, order: result.order });
}
