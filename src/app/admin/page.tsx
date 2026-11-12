import { Suspense } from "react";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { expireUnpaidOrdersSafe } from "@/lib/inventory";
import AdminClient, { type AdminOrder, type AdminPayment } from "./AdminClient";

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-6 py-16 text-neutral-500">Loading admin...</div>}>
      <AdminLoader />
    </Suspense>
  );
}

async function AdminLoader() {
  await requireRole(["ADMIN"], "/admin");
  await expireUnpaidOrdersSafe();
  const [paymentRows, orderRows] = await Promise.all([
    prisma.order.findMany({
      where: { paymentStatus: { in: ["PENDING", "SUBMITTED"] } },
      include: { user: { select: { email: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      include: {
        user: { select: { email: true, name: true } },
        fulfillments: { include: { vendor: { select: { storeName: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);
  const payments: AdminPayment[] = paymentRows.map((row) => ({
    id: row.id,
    orderNo: row.orderNo,
    total: row.total,
    paymentStatus: row.paymentStatus,
    status: row.status,
    upiTxnRef: row.upiTxnRef,
    createdAt: row.createdAt.toISOString(),
    customerName: row.user.name,
    customerEmail: row.user.email,
  }));
  const orders: AdminOrder[] = orderRows.map((row) => ({
    id: row.id,
    orderNo: row.orderNo,
    total: row.total,
    paymentStatus: row.paymentStatus,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    refundMarkedAt: row.refundMarkedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    customerName: row.user.name,
    customerEmail: row.user.email,
    fulfillments: row.fulfillments.map((f) => ({
      id: f.id,
      status: f.status,
      trackingNumber: f.trackingNumber,
      vendorName: f.vendor.storeName,
    })),
  }));
  return <AdminClient payments={payments} orders={orders} />;
}
