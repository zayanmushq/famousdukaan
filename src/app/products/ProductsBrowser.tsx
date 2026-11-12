"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import type { CatalogProduct } from "@/lib/catalog";

const sortOptions = [
  { id: "featured", label: "Featured" },
  { id: "price-low", label: "Price: Low to High" },
  { id: "price-high", label: "Price: High to Low" },
  { id: "rating", label: "Top Rated" },
  { id: "newest", label: "Newest" },
];

export default function ProductsBrowser({
  products,
  initialQuery = "",
}: {
  products: CatalogProduct[];
  initialQuery?: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const categories = ["All", ...Array.from(new Set(products.map((p) => p.category)))];
  const queryFromUrl = searchParams.get("q") ?? initialQuery;
  const [search, setSearch] = useState(queryFromUrl);
  const [category, setCategory] = useState("All");
  const [maxPrice, setMaxPrice] = useState(1000);
  const [sort, setSort] = useState("featured");

  const updateSearch = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = value.trim();
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const filtered = useMemo(() => {
    let result = products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.vendor.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === "All" || p.category === category;
      const matchesPrice = p.price <= maxPrice;
      return matchesSearch && matchesCategory && matchesPrice;
    });

    if (sort === "price-low") result = [...result].sort((a, b) => a.price - b.price);
    if (sort === "price-high") result = [...result].sort((a, b) => b.price - a.price);
    if (sort === "rating") result = [...result].sort((a, b) => b.rating - a.rating);

    return result;
  }, [products, search, category, maxPrice, sort]);

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Shop</h1>
          <p className="mt-2 text-neutral-500">Curated by independent vendors</p>
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-4 py-2 text-sm border border-neutral-200 rounded-full bg-white dark:bg-neutral-900"
        >
          {sortOptions.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="mb-10 flex flex-col md:flex-row gap-4 md:items-center">
        <input
          type="text"
          placeholder="Search products or vendors..."
          value={search}
          onChange={(e) => updateSearch(e.target.value)}
          className="flex-1 max-w-md px-4 py-2.5 text-sm border border-neutral-200 rounded-full focus:outline-none focus:border-neutral-400"
        />
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-1.5 text-xs rounded-full border transition-colors ${
                category === cat
                  ? "bg-neutral-900 text-white border-neutral-900"
                  : "border-neutral-300 text-neutral-600 hover:border-neutral-400"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm text-neutral-600">
          <span>Under ${maxPrice}</span>
          <input
            type="range"
            min="50"
            max="1000"
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="w-32"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-neutral-500 py-20 text-center">No products found.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-16">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
