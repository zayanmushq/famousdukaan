import { Suspense } from "react";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { expireUnpaidOrdersSafe } from "@/lib/inventory";
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
  await expireUnpaidOrdersSafe();
  const rows = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      fulfillments: { include: { vendor: { select: { storeName: true } } } },
    },
  });
  const orders = rows.map((row) => ({
    id: row.id,
    orderNo: row.orderNo,
    total: row.total,
    status: row.status,
    paymentStatus: row.paymentStatus,
    createdAt: row.createdAt.toISOString(),
    upiTxnRef: row.upiTxnRef,
    fulfillments: row.fulfillments.map((f) => ({
      id: f.id,
      status: f.status,
      trackingNumber: f.trackingNumber,
      vendorName: f.vendor.storeName,
    })),
  }));
  return <OrdersClient orders={orders} />;
}
