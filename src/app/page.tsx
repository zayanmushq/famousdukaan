import type { Metadata } from "next";
import { Suspense } from "react";
import ProductCard from "@/components/ProductCard";
import { getProducts } from "@/lib/catalog";
import Link from "next/link";

export const metadata: Metadata = {
  title: { absolute: "FamousDukaan — Premium Multivendor Marketplace" },
  description: "India's modern multivendor marketplace. Simple, minimalist, premium shopping from independent vendors.",
  alternates: { canonical: "/" },
};


export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8">
      <section className="py-28 md:py-36 text-center">
        <h1 className="text-5xl md:text-7xl font-light tracking-tighter max-w-4xl mx-auto leading-[1.05] text-neutral-900 dark:text-neutral-100">
          Every shop, famous shop.
        </h1>
        <p className="mt-8 text-lg text-neutral-500 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
          India&apos;s modern multivendor marketplace.
        </p>
        <div className="mt-12">
          <Link
            href="/products"
            className="inline-flex px-10 py-3.5 text-sm font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-full hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
          >
            Explore Collection
          </Link>
        </div>
      </section>

      <section className="pb-28">
        <div className="flex items-baseline justify-between mb-12">
          <h2 className="text-2xl font-light tracking-tight">Featured</h2>
          <Link href="/products" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
            View all →
          </Link>
        </div>
        <Suspense fallback={<div className="text-neutral-500">Loading featured products...</div>}>
          <FeaturedProducts />
        </Suspense>
      </section>
    </div>
  );
}

async function FeaturedProducts() {
  const { products } = await getProducts();
  const featured = products.slice(0, 6);
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-16">
      {featured.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
