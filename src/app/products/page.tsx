import { Suspense } from "react";
import { getProducts } from "@/lib/catalog";
import ProductsBrowser from "./ProductsBrowser";

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-6 py-16 text-neutral-500">Loading products...</div>}>
      <ProductsLoader />
    </Suspense>
  );
}

async function ProductsLoader() {
  const { products } = await getProducts();
  return <ProductsBrowser products={products} />;
}
