import { Suspense } from "react";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { expireUnpaidOrdersSafe } from "@/lib/inventory";
import AdminClient, { type AdminOrder, type AdminPayment, type AdminReview, type AdminVendor } from "./AdminClient";

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
  const [paymentRows, orderRows, reviewRows, vendorRows] = await Promise.all([
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
    prisma.review.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.vendor.findMany({
      include: {
        user: { select: { id: true, email: true, name: true, role: true } },
        reviewedBy: { select: { id: true, email: true, name: true } },
        _count: { select: { products: true } },
      },
      orderBy: { createdAt: "desc" },
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
  const reviews: AdminReview[] = reviewRows.map((row) => ({
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    productId: row.product.id,
    productName: row.product.name,
    customerName: row.user.name,
    customerEmail: row.user.email,
  }));
  const vendors: AdminVendor[] = vendorRows.map((row) => ({
    id: row.id,
    storeName: row.storeName,
    slug: row.slug,
    description: row.description,
    contactPhone: row.contactPhone,
    pickupCity: row.pickupCity,
    pickupState: row.pickupState,
    pickupPincode: row.pickupPincode,
    pan: row.pan,
    gstin: row.gstin,
    bankAccountHolder: row.bankAccountHolder,
    bankIfsc: row.bankIfsc,
    bankAccountMasked: row.bankAccountLast4 ? `XXXXXX${row.bankAccountLast4}` : null,
    status: row.status,
    statusReason: row.statusReason,
    reviewedAt: row.reviewedAt,
    reviewedBy: row.reviewedBy,
    createdAt: row.createdAt,
    user: row.user,
    productCount: row._count.products,
  }));
  return <AdminClient payments={payments} orders={orders} reviews={reviews} vendors={vendors} />;
}
