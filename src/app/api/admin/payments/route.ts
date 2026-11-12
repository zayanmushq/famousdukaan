import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  const orders = await prisma.order.findMany({
    where: { paymentStatus: { in: ["PENDING", "SUBMITTED"] } },
    include: {
      user: { select: { id: true, email: true, name: true } },
      items: { select: { id: true, quantity: true, price: true, product: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ orders });
}
