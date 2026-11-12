import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { adjustStock, expireUnpaidOrdersSafe } from "@/lib/inventory";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireApiRole(["VENDOR", "ADMIN"]);
  if (error || !session) return error;
  if (session.user.role === "VENDOR" && session.user.vendorStatus !== "APPROVED") {
    return NextResponse.json({ error: "Store must be approved before inventory can be changed" }, { status: 403 });
  }

  await expireUnpaidOrdersSafe();
  const { id } = await context.params;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  if (session.user.role !== "ADMIN" && product.vendorId !== session.user.vendorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const payload = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;

  const data: { sku?: string | null; lowStockThreshold?: number } = {};
  if ("sku" in payload) {
    const sku = String(payload.sku || "").trim();
    data.sku = sku || null;
  }
  if ("lowStockThreshold" in payload) {
    const threshold = Number(payload.lowStockThreshold);
    if (!Number.isInteger(threshold) || threshold < 0) {
      return NextResponse.json({ error: "lowStockThreshold must be a non-negative integer" }, { status: 400 });
    }
    data.lowStockThreshold = threshold;
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if ("stock" in payload) {
        const stock = Number(payload.stock);
        if (!Number.isInteger(stock) || stock < 0) {
          throw new Error("INVALID_STOCK");
        }
        await adjustStock(tx, {
          productId: id,
          stock,
          createdById: session.user.id,
          reason: "Vendor inventory update",
        });
      }
      return tx.product.update({
        where: { id },
        data,
        select: {
          id: true,
          name: true,
          sku: true,
          stock: true,
          lowStockThreshold: true,
          price: true,
          status: true,
        },
      });
    });
    return NextResponse.json({ success: true, product: updated });
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_STOCK") {
      return NextResponse.json({ error: "stock must be a non-negative integer" }, { status: 400 });
    }
    const code = typeof err === "object" && err && "code" in err ? String((err as { code?: string }).code) : "";
    if (code === "P2002") {
      return NextResponse.json({ error: "That SKU is already used on another product" }, { status: 409 });
    }
    throw err;
  }
}
