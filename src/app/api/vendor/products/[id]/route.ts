import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { expireUnpaidOrdersSafe } from "@/lib/inventory";
import {
  applyStockIfNeeded,
  parseProductWrite,
  slugifyProductName,
  uniqueProductSlug,
  vendorProductSelect,
} from "@/lib/vendor-products";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireApiRole(["VENDOR", "ADMIN"]);
  if (error || !session) return error;
  if (session.user.role === "VENDOR" && session.user.vendorStatus !== "APPROVED") {
    return NextResponse.json({ error: "Store must be approved before products can be changed" }, { status: 403 });
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

  const parsed = await parseProductWrite(payload, { partial: true });
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: parsed.status });

  const { stock, ...fields } = parsed.data;
  if ("lowStockThreshold" in payload) {
    const threshold = Number(payload.lowStockThreshold);
    if (!Number.isInteger(threshold) || threshold < 0) {
      return NextResponse.json({ error: "lowStockThreshold must be a non-negative integer" }, { status: 400 });
    }
    fields.lowStockThreshold = threshold;
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if ("name" in fields && typeof fields.name === "string" && fields.name !== product.name) {
        fields.slug = await uniqueProductSlug(tx, slugifyProductName(fields.name), id);
      }
      if (typeof stock === "number") {
        await applyStockIfNeeded(tx, id, stock, session.user.id, "Vendor inventory update");
      }
      // If selling price changed but MRP was not sent, keep existing MRP check
      const nextPrice = (fields.price as number | undefined) ?? product.price;
      const nextMrp = ("comparePrice" in fields ? (fields.comparePrice as number | null) : product.comparePrice);
      if (nextMrp != null && nextMrp < nextPrice) {
        throw new Error("INVALID_MRP");
      }
      return tx.product.update({
        where: { id },
        data: fields,
        select: vendorProductSelect,
      });
    });
    return NextResponse.json({ success: true, product: updated });
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_MRP") {
      return NextResponse.json({ error: "MRP must be greater than or equal to the selling price" }, { status: 400 });
    }
    const code = typeof err === "object" && err && "code" in err ? String((err as { code?: string }).code) : "";
    if (code === "P2002") {
      return NextResponse.json({ error: "That SKU is already used on another product" }, { status: 409 });
    }
    throw err;
  }
}
