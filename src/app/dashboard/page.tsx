import { Suspense } from "react";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { expireUnpaidOrdersSafe } from "@/lib/inventory";
import DashboardClient, { type DashboardCategory, type DashboardFulfillment, type DashboardProduct } from "./DashboardClient";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto px-6 py-16 text-neutral-500">Loading dashboard...</div>}>
      <DashboardLoader />
    </Suspense>
  );
}

async function DashboardLoader() {
  const session = await requireRole(["VENDOR", "ADMIN"], "/dashboard");
  await expireUnpaidOrdersSafe();
  const vendor = session.user.vendorId
    ? await prisma.vendor.findUnique({ where: { id: session.user.vendorId } })
    : null;

  const vendorId = session.user.vendorId;
  const [productRows, categoryRows] = await Promise.all([
    vendorId
      ? prisma.product.findMany({
          where: { vendorId },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            sku: true,
            stock: true,
            lowStockThreshold: true,
            price: true,
            comparePrice: true,
            status: true,
            images: true,
            countryOfOrigin: true,
          },
        })
      : Promise.resolve([]),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  const products: DashboardProduct[] = productRows;
  const categories: DashboardCategory[] = categoryRows;

  const fulfillmentRows = vendorId
    ? await prisma.orderFulfillment.findMany({
        where: { vendorId },
        include: {
          order: { select: { id: true, orderNo: true, paymentStatus: true, status: true, createdAt: true, shippingAddress: true } },
          items: { include: { product: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      })
    : [];

  const fulfillments: DashboardFulfillment[] = fulfillmentRows.map((row) => {
    const address = row.order.shippingAddress as { name?: string; city?: string; pincode?: string } | null;
    return {
      id: row.id,
      status: row.status,
      trackingNumber: row.trackingNumber,
      items: row.items,
      order: {
        id: row.order.id,
        orderNo: row.order.orderNo,
        paymentStatus: row.order.paymentStatus,
        status: row.order.status,
        createdAt: row.order.createdAt.toISOString(),
        customerName: address?.name || "Customer",
        city: address?.city || "",
        pincode: address?.pincode || "",
      },
    };
  });

  return (
    <DashboardClient
      storeName={vendor?.storeName || session.user.name}
      vendorStatus={session.user.vendorStatus ?? (session.user.role === "ADMIN" ? "APPROVED" : null)}
      products={products}
      fulfillments={fulfillments}
      categories={categories}
    />
  );
}
