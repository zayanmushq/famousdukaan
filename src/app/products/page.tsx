import type { Metadata } from "next";
import { Suspense } from "react";
import { getProducts } from "@/lib/catalog";
import ProductsBrowser from "./ProductsBrowser";

export const metadata: Metadata = {
  title: "Shop",
  description: "Curated by independent vendors.",
  alternates: { canonical: "/products" },
};


type ProductsPageProps = { searchParams: Promise<{ q?: string }> };

export default function ProductsPage({ searchParams }: ProductsPageProps) {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-6 py-16 text-neutral-500">Loading products...</div>}>
      <ProductsLoader searchParams={searchParams} />
    </Suspense>
  );
}

async function ProductsLoader({ searchParams }: ProductsPageProps) {
  const [{ products }, params] = await Promise.all([getProducts(), searchParams]);
  const initialQuery = params.q ?? "";
  return <ProductsBrowser key={initialQuery} products={products} initialQuery={initialQuery} />;
}
