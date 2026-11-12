import { Suspense } from "react";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto px-6 py-16 text-neutral-500">Loading dashboard...</div>}>
      <DashboardLoader />
    </Suspense>
  );
}

async function DashboardLoader() {
  const session = await requireRole(["VENDOR", "ADMIN"], "/dashboard");
  const vendor = session.user.vendorId
    ? await prisma.vendor.findUnique({ where: { id: session.user.vendorId } })
    : null;
  return (
    <DashboardClient
      storeName={vendor?.storeName || session.user.name}
      vendorStatus={session.user.vendorStatus}
    />
  );
}
