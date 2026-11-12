import { Suspense } from "react";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import OrdersClient from "./OrdersClient";

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-6 py-16 text-neutral-500">Loading orders...</div>}>
      <OrdersLoader />
    </Suspense>
  );
}

async function OrdersLoader() {
  const session = await requireAuth("/orders");
  const rows = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNo: true,
      total: true,
      status: true,
      paymentStatus: true,
      createdAt: true,
      upiTxnRef: true,
    },
  });
  const orders = rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
  return <OrdersClient orders={orders} />;
}
