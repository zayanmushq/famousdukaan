"use client";

import { useState, useEffect } from "react";
import ProductCard from "@/components/ProductCard";
import { products } from "@/lib/data";

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("wishlist");
    if (saved) setWishlist(JSON.parse(saved));
  }, []);

  const items = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-light tracking-tight mb-2">Wishlist</h1>
      <p className="text-neutral-500 mb-10">{items.length} items saved</p>

      {items.length === 0 ? (
        <p className="text-neutral-500 py-20 text-center">Your wishlist is empty.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-16">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}