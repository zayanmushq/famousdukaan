"use client";

import { useState } from "react";
import { addToCart } from "@/lib/cart";
import { formatInr } from "@/lib/money";

export default function AddToCartButton({
  productId,
  price,
  stock = 0,
}: {
  productId: string;
  price: number;
  stock?: number;
}) {
  const [added, setAdded] = useState(false);
  const inStock = stock > 0;

  return (
    <button
      type="button"
      disabled={!inStock}
      onClick={() => {
        if (!inStock) return;
        addToCart(productId, 1, stock);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1600);
      }}
      className="px-10 py-3.5 bg-neutral-900 text-white text-sm font-medium rounded-full hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {!inStock ? "Out of stock" : added ? "Added to cart" : `Add to Cart · ${formatInr(price)}`}
    </button>
  );
}
