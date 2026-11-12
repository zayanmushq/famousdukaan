import { NextResponse } from "next/server";
import type { OrderStatus, PaymentStatus } from "@prisma/client";
import { requireApiRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { expireUnpaidOrdersSafe } from "@/lib/inventory";

const PAYMENT_STATUSES: PaymentStatus[] = ["PENDING", "SUBMITTED", "PAID", "REJECTED"];
const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "PENDING_PAYMENT",
  "CONFIRMED",
  "PACKED",
  "PARTIALLY_SHIPPED",
  "SHIPPED",
  "PARTIALLY_DELIVERED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
];

export async function GET(request: Request) {
  const { error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  await expireUnpaidOrdersSafe();

  const url = new URL(request.url);
  const paymentStatus = url.searchParams.get("paymentStatus");
  const status = url.searchParams.get("status");
  const vendorId = url.searchParams.get("vendorId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (paymentStatus && PAYMENT_STATUSES.includes(paymentStatus as PaymentStatus)) {
    where.paymentStatus = paymentStatus;
  }
  if (status && ORDER_STATUSES.includes(status as OrderStatus)) {
    where.status = status;
  }
  if (vendorId) {
    where.OR = [
      { vendorId },
      { fulfillments: { some: { vendorId } } },
    ];
  }
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      user: { select: { id: true, email: true, name: true } },
      fulfillments: {
        include: {
          vendor: { select: { id: true, storeName: true } },
          items: { include: { product: { select: { id: true, name: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ orders });
}
