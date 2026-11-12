"use client";

import { useState } from "react";
import { addToCart } from "@/lib/cart";
import { formatInr } from "@/lib/money";

export default function AddToCartButton({
  productId,
  price,
}: {
  productId: string;
  price: number;
}) {
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        addToCart(productId, 1);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1600);
      }}
      className="px-10 py-3.5 bg-neutral-900 text-white text-sm font-medium rounded-full hover:bg-neutral-800 transition-colors"
    >
      {added ? "Added to cart" : `Add to Cart · ${formatInr(price)}`}
    </button>
  );
}
