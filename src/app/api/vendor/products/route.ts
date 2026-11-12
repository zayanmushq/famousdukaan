import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { expireUnpaidOrdersSafe } from "@/lib/inventory";

export async function GET() {
  const { session, error } = await requireApiRole(["VENDOR", "ADMIN"]);
  if (error || !session) return error;

  await expireUnpaidOrdersSafe();

  if (session.user.role === "VENDOR" && !session.user.vendorId) {
    return NextResponse.json({ error: "Vendor profile not found" }, { status: 403 });
  }

  const products = await prisma.product.findMany({
    where: session.user.role === "ADMIN" && !session.user.vendorId
      ? undefined
      : { vendorId: session.user.vendorId! },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      sku: true,
      stock: true,
      lowStockThreshold: true,
      price: true,
      status: true,
      images: true,
    },
  });
  return NextResponse.json({ products, vendorStatus: session.user.vendorStatus });
}
