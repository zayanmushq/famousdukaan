import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { maskAccountNumber } from "@/lib/vendor-crypto";

export function serializeAdminVendor(vendor: {
  id: string;
  storeName: string;
  slug: string;
  description: string | null;
  contactPhone: string | null;
  pickupCity: string | null;
  pickupState: string | null;
  pickupPincode: string | null;
  pan: string | null;
  gstin: string | null;
  bankAccountHolder: string | null;
  bankIfsc: string | null;
  bankAccountLast4: string | null;
  status: string;
  statusReason: string | null;
  reviewedAt: Date | null;
  reviewedById: string | null;
  createdAt: Date;
  user: { id: string; email: string; name: string | null; role: string };
  reviewedBy: { id: string; email: string; name: string | null } | null;
  _count: { products: number };
}) {
  return {
    id: vendor.id,
    storeName: vendor.storeName,
    slug: vendor.slug,
    description: vendor.description,
    contactPhone: vendor.contactPhone,
    pickupCity: vendor.pickupCity,
    pickupState: vendor.pickupState,
    pickupPincode: vendor.pickupPincode,
    pan: vendor.pan,
    gstin: vendor.gstin,
    bankAccountHolder: vendor.bankAccountHolder,
    bankIfsc: vendor.bankIfsc,
    bankAccountMasked: maskAccountNumber(vendor.bankAccountLast4),
    status: vendor.status,
    statusReason: vendor.statusReason,
    reviewedAt: vendor.reviewedAt,
    reviewedById: vendor.reviewedById,
    reviewedBy: vendor.reviewedBy,
    createdAt: vendor.createdAt,
    user: vendor.user,
    productCount: vendor._count.products,
  };
}

export const adminVendorInclude = {
  user: { select: { id: true, email: true, name: true, role: true } },
  reviewedBy: { select: { id: true, email: true, name: true } },
  _count: { select: { products: true } },
} as const;

export async function GET() {
  const { error } = await requireApiRole(["ADMIN"]);
  if (error) return error;
  const vendors = await prisma.vendor.findMany({
    include: adminVendorInclude,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ vendors: vendors.map(serializeAdminVendor) });
}
