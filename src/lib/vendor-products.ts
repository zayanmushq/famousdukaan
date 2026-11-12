import type { Prisma } from "@prisma/client";
import { adjustStock } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";

export const vendorProductSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  category: true,
  price: true,
  comparePrice: true,
  stock: true,
  sku: true,
  lowStockThreshold: true,
  images: true,
  countryOfOrigin: true,
  status: true,
  vendorId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductSelect;

const HTTP_URL = /^https?:\/\/[^\s]+$/i;
const PRODUCT_STATUSES = new Set(["DRAFT", "ACTIVE", "ARCHIVED"]);

export type ProductWriteResult =
  | { error: string; status: number }
  | { data: Record<string, unknown> & { stock?: number } };

export async function parseProductWrite(
  payload: Record<string, unknown>,
  options: { partial: boolean }
): Promise<ProductWriteResult> {
  const data: Record<string, unknown> = {};
  const required = (key: string) => !options.partial || key in payload;

  if (required("name")) {
    const name = String(payload.name || "").trim();
    if (name.length < 2) return { error: "Product name is required", status: 400 };
    if (name.length > 120) return { error: "Product name is too long", status: 400 };
    data.name = name;
  }
  if (required("description")) {
    const description = String(payload.description || "").trim();
    data.description = description || null;
  }
  if (required("category")) {
    const category = String(payload.category || "").trim();
    const row = await prisma.category.findFirst({ where: { name: category } });
    if (!row) return { error: "Choose a valid category", status: 400 };
    data.category = row.name;
  }
  if (required("price")) {
    const price = Number(payload.price);
    if (!Number.isInteger(price) || price < 1) {
      return { error: "Price must be a whole number of rupees of at least 1", status: 400 };
    }
    data.price = price;
  }
  if ("comparePrice" in payload || (!options.partial && "mrp" in payload)) {
    const raw = payload.comparePrice ?? payload.mrp;
    if (raw === null || raw === "" || raw === undefined) {
      data.comparePrice = null;
    } else {
      const mrp = Number(raw);
      if (!Number.isInteger(mrp) || mrp < 1) {
        return { error: "MRP must be a whole number of rupees of at least 1", status: 400 };
      }
      data.comparePrice = mrp;
    }
  }
  if (data.comparePrice != null && data.price != null && Number(data.comparePrice) < Number(data.price)) {
    return { error: "MRP must be greater than or equal to the selling price", status: 400 };
  }
  if ("images" in payload || required("images")) {
    const raw = payload.images;
    const list = Array.isArray(raw)
      ? raw
      : typeof raw === "string" && raw.trim()
        ? raw.split(/[\n,]+/)
        : [];
    const images = list.map((value) => String(value).trim()).filter(Boolean);
    if (images.length > 8) return { error: "You can add up to 8 images", status: 400 };
    if (images.some((url) => !HTTP_URL.test(url) || url.length > 2000)) {
      return { error: "Each image must be a valid http(s) URL", status: 400 };
    }
    data.images = images;
  }
  if ("countryOfOrigin" in payload || required("countryOfOrigin")) {
    const origin = String(payload.countryOfOrigin || "").trim();
    if (origin.length > 80) return { error: "Country of origin is too long", status: 400 };
    data.countryOfOrigin = origin || null;
  }
  if ("sku" in payload) {
    const sku = String(payload.sku || "").trim();
    data.sku = sku || null;
  }
  if ("status" in payload || required("status")) {
    const status = String(payload.status || "DRAFT").toUpperCase();
    if (!PRODUCT_STATUSES.has(status)) {
      return { error: "Status must be DRAFT, ACTIVE, or ARCHIVED", status: 400 };
    }
    data.status = status;
  }
  if ("stock" in payload) {
    const stock = Number(payload.stock);
    if (!Number.isInteger(stock) || stock < 0) {
      return { error: "stock must be a non-negative integer", status: 400 };
    }
    data.stock = stock;
  }
  if (data.status === "ACTIVE" && data.stock === 0) {
    data.status = "OUT_OF_STOCK";
  }
  return { data };
}

export function slugifyProductName(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "product"
  );
}

export async function uniqueProductSlug(tx: Prisma.TransactionClient, base: string, excludeId?: string) {
  let slug = base;
  let n = 2;
  while (true) {
    const clash = await tx.product.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (!clash) return slug;
    slug = `${base}-${n}`;
    n += 1;
  }
}

export async function applyStockIfNeeded(
  tx: Prisma.TransactionClient,
  productId: string,
  stock: number | undefined,
  createdById: string,
  reason: string
) {
  if (stock === undefined) return;
  await adjustStock(tx, { productId, stock, createdById, reason });
}
