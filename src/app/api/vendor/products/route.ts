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

function vendorScope(session: { user: { role: string; vendorId?: string | null } }) {
  if (session.user.role === "ADMIN" && !session.user.vendorId) return undefined;
  return { vendorId: session.user.vendorId! };
}

export async function GET() {
  const { session, error } = await requireApiRole(["VENDOR", "ADMIN"]);
  if (error || !session) return error;

  await expireUnpaidOrdersSafe();

  if (session.user.role === "VENDOR" && !session.user.vendorId) {
    return NextResponse.json({ error: "Vendor profile not found" }, { status: 403 });
  }

  const products = await prisma.product.findMany({
    where: vendorScope(session),
    orderBy: { createdAt: "asc" },
    select: vendorProductSelect,
  });
  return NextResponse.json({ products, vendorStatus: session.user.vendorStatus });
}

export async function POST(request: Request) {
  const { session, error } = await requireApiRole(["VENDOR", "ADMIN"]);
  if (error || !session) return error;
  if (session.user.role === "VENDOR" && session.user.vendorStatus !== "APPROVED") {
    return NextResponse.json({ error: "Store must be approved before products can be created" }, { status: 403 });
  }
  if (!session.user.vendorId) {
    return NextResponse.json({ error: "Vendor profile not found" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    const raw = await request.json();
    body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = await parseProductWrite(body, { partial: false });
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: parsed.status });

  const { stock, ...fields } = parsed.data;
  const name = String(fields.name);

  try {
    const product = await prisma.$transaction(async (tx) => {
      const slug = await uniqueProductSlug(tx, slugifyProductName(name));
      const created = await tx.product.create({
        data: {
          vendorId: session.user.vendorId!,
          name,
          slug,
          description: (fields.description as string | null) ?? null,
          category: String(fields.category),
          price: Number(fields.price),
          comparePrice: (fields.comparePrice as number | null | undefined) ?? null,
          images: (fields.images as string[]) || [],
          countryOfOrigin: (fields.countryOfOrigin as string | null | undefined) ?? null,
          sku: (fields.sku as string | null | undefined) ?? null,
          status: (fields.status as "DRAFT" | "ACTIVE" | "ARCHIVED" | "OUT_OF_STOCK") || "DRAFT",
          stock: 0,
        },
        select: vendorProductSelect,
      });
      if (typeof stock === "number" && stock > 0) {
        await applyStockIfNeeded(tx, created.id, stock, session.user.id, "Initial stock");
      }
      return tx.product.findUniqueOrThrow({ where: { id: created.id }, select: vendorProductSelect });
    });
    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (err) {
    const code = typeof err === "object" && err && "code" in err ? String((err as { code?: string }).code) : "";
    if (code === "P2002") {
      return NextResponse.json({ error: "That SKU is already used on another product" }, { status: 409 });
    }
    throw err;
  }
}
