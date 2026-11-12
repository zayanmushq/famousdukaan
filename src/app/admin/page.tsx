import { Suspense } from "react";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import AdminClient, { type AdminPayment } from "./AdminClient";

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-6 py-16 text-neutral-500">Loading admin...</div>}>
      <AdminLoader />
    </Suspense>
  );
}

async function AdminLoader() {
  await requireRole(["ADMIN"], "/admin");
  const rows = await prisma.order.findMany({
    where: { paymentStatus: { in: ["PENDING", "SUBMITTED"] } },
    include: { user: { select: { email: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const payments: AdminPayment[] = rows.map((row) => ({
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
  return <AdminClient payments={payments} />;
}
