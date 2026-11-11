"use client";

import { useState } from "react";
import { products } from "@/lib/data";

export default function CartPage() {
  const [items] = useState(products.slice(0, 3));

  // Group by vendor
  const grouped = items.reduce((acc, item) => {
    if (!acc[item.vendor]) acc[item.vendor] = [];
    acc[item.vendor].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  const total = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-light tracking-tight mb-12">Cart</h1>
      {items.length === 0 ? (
        <p className="text-neutral-500">Your cart is empty.</p>
      ) : (
        <>
          {Object.entries(grouped).map(([vendor, vendorItems]) => (
            <div key={vendor} className="mb-10">
              <div className="text-sm font-medium text-neutral-500 mb-4 uppercase tracking-wide">{vendor}</div>
              <div className="space-y-4">
                {vendorItems.map((item) => (
                  <div key={item.id} className="flex gap-5 py-3">
                    <div className="w-16 h-20 bg-neutral-100 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="mt-1 text-sm text-neutral-500">${item.price}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-10 pt-6 border-t border-neutral-200 flex justify-between text-lg">
            <span>Total</span>
            <span className="font-medium">${total}</span>
          </div>
          <button className="mt-8 w-full py-4 bg-neutral-900 text-white text-sm font-medium rounded-full hover:bg-neutral-800 transition-colors">
            Checkout
          </button>
          <p className="mt-4 text-xs text-neutral-500 text-center">
            Items from multiple vendors will be fulfilled separately.
          </p>
        </>
      )}
    </div>
  );
}