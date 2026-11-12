import {
  products as demoProducts,
  vendors as demoVendors,
  recommended as demoRecommended,
} from "@/lib/data";
import { connection } from "next/server";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { expireUnpaidOrdersSafe } from "@/lib/inventory";

export type CatalogProduct = (typeof demoProducts)[number] & { countryOfOrigin?: string | null };
export type CatalogVendor = (typeof demoVendors)[number];
export type CatalogReview = { name: string; rating: number; comment: string };
export type CatalogSource = "db" | "demo";

const PUBLIC_PRODUCT_WHERE = {
  status: { in: ["ACTIVE", "OUT_OF_STOCK"] as ("ACTIVE" | "OUT_OF_STOCK")[] },
  vendor: { status: "APPROVED" as const },
};

type ProductRow = {
  id: string;
  name: string;
  price: number;
  stock: number;
  images: string[];
  category: string;
  rating: number;
  reviewCount: number;
  fastDelivery: boolean;
  vendorId: string;
  status: string;
  countryOfOrigin?: string | null;
  vendor: { id: string; storeName: string; rating: number; status: string };
};

type VendorRow = {
  id: string;
  storeName: string;
  description: string | null;
  rating: number;
  status: string;
  _count: { products: number };
};

function mapProduct(row: ProductRow): CatalogProduct {
  const image = row.images[0] ?? "";
  const offer = {
    vendor: row.vendor.storeName,
    vendorId: row.vendor.id,
    price: row.price,
    rating: row.vendor.rating,
    delivery: row.fastDelivery ? "2-3 days" : "3-5 days",
  };
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    stock: row.stock,
    vendor: row.vendor.storeName,
    vendorId: row.vendorId,
    image,
    category: row.category,
    rating: row.rating,
    reviews: row.reviewCount,
    fastDelivery: row.fastDelivery,
    countryOfOrigin: row.countryOfOrigin ?? null,
    offers: [offer],
  };
}

function mapVendor(row: VendorRow): CatalogVendor {
  return {
    id: row.id,
    name: row.storeName,
    description: row.description ?? "",
    rating: row.rating,
    products: row._count.products,
  };
}

async function fromDb<T>(fn: () => Promise<T>): Promise<T> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  return fn();
}

export const getProducts = cache(async function getProducts(): Promise<{ source: CatalogSource; products: CatalogProduct[] }> {
  await connection();
  try {
    await expireUnpaidOrdersSafe();
    const rows = await fromDb(() =>
      prisma.product.findMany({
        where: PUBLIC_PRODUCT_WHERE,
        include: { vendor: true },
        orderBy: { createdAt: "asc" },
      })
    );
    return { source: "db", products: rows.map(mapProduct) };
  } catch (error) {
    console.error("getProducts fell back to demo data:", error);
    return { source: "demo", products: demoProducts };
  }
});

export const getVendors = cache(async function getVendors(): Promise<{ source: CatalogSource; vendors: CatalogVendor[] }> {
  await connection();
  try {
    const rows = await fromDb(() =>
      prisma.vendor.findMany({
        where: { status: "APPROVED" },
        include: { _count: { select: { products: { where: { status: { in: ["ACTIVE", "OUT_OF_STOCK"] } } } } } },
        orderBy: { createdAt: "asc" },
      })
    );
    return { source: "db", vendors: rows.map(mapVendor) };
  } catch (error) {
    console.error("getVendors fell back to demo data:", error);
    return { source: "demo", vendors: demoVendors };
  }
});

export const getProductById = cache(async function getProductById(id: string): Promise<{
  source: CatalogSource;
  product: CatalogProduct;
  reviews: CatalogReview[];
  recommended: CatalogProduct[];
} | null> {
  await connection();
  try {
    await expireUnpaidOrdersSafe();
    const row = await fromDb(() =>
      prisma.product.findUnique({
        where: { id },
        include: {
          vendor: true,
          reviews: { where: { status: "VISIBLE" }, include: { user: true }, orderBy: { createdAt: "asc" } },
        },
      })
    );
    if (!row) return null;
    if (row.status !== "ACTIVE" && row.status !== "OUT_OF_STOCK") return null;
    if (row.vendor.status !== "APPROVED") return null;

    const { products } = await getProducts();
    const recommended = products.filter((p) => demoRecommended.includes(p.id) && p.id !== id);
    return {
      source: "db",
      product: mapProduct(row),
      reviews: row.reviews.map((review) => ({
        name: review.user.name || "Customer",
        rating: review.rating,
        comment: review.comment || "",
      })),
      recommended,
    };
  } catch (error) {
    console.error("getProductById fell back to demo data:", error);
    const product = demoProducts.find((p) => p.id === id);
    if (!product) return null;
    return {
      source: "demo",
      product,
      reviews: [],
      recommended: demoProducts.filter((p) => demoRecommended.includes(p.id) && p.id !== id),
    };
  }
});

export const getVendorById = cache(async function getVendorById(id: string): Promise<{
  source: CatalogSource;
  vendor: CatalogVendor;
  products: CatalogProduct[];
} | null> {
  await connection();
  try {
    const row = await fromDb(() =>
      prisma.vendor.findUnique({
        where: { id },
        include: { _count: { select: { products: true } } },
      })
    );
    if (!row || row.status !== "APPROVED") return null;
    const { products } = await getProducts();
    return {
      source: "db",
      vendor: mapVendor(row),
      products: products.filter((p) => p.vendorId === id),
    };
  } catch (error) {
    console.error("getVendorById fell back to demo data:", error);
    const vendor = demoVendors.find((v) => v.id === id);
    if (!vendor) return null;
    return {
      source: "demo",
      vendor,
      products: demoProducts.filter((p) => p.vendorId === id),
    };
  }
});
