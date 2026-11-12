"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCart, updateCartQuantity, type CartItem } from "@/lib/cart";
import { formatInr } from "@/lib/money";

type CatalogProduct = {
  id: string;
  name: string;
  price: number;
  vendor: string;
  image: string;
  stock?: number;
};

export default function CartPage() {
  const [cart, setCartState] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const refresh = () => setCartState(getCart());
    refresh();
    window.addEventListener("famousdukaan-cart-changed", refresh);
    window.addEventListener("storage", refresh);
    fetch("/api/products")
      .then((res) => res.json())
      .then((data: { products?: CatalogProduct[] }) => setProducts(data.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoaded(true));
    return () => {
      window.removeEventListener("famousdukaan-cart-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const lines = cart
    .map((item) => {
      const product = productMap.get(item.productId);
      if (!product) return null;
      const stock = product.stock ?? 0;
      const quantity = Math.min(item.quantity, Math.max(stock, 0));
      return { ...item, quantity, product, stock, lineTotal: product.price * quantity, outOfStock: stock <= 0 };
    })
    .filter((line): line is NonNullable<typeof line> => line !== null);

  const grouped = lines.reduce((acc, line) => {
    if (!acc[line.product.vendor]) acc[line.product.vendor] = [];
    acc[line.product.vendor].push(line);
    return acc;
  }, {} as Record<string, typeof lines>);

  const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const missing = loaded && cart.some((item) => !productMap.has(item.productId));

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-light tracking-tight mb-12">Cart</h1>
      {!loaded ? (
        <p className="text-neutral-500">Loading cart...</p>
      ) : cart.length === 0 ? (
        <div>
          <p className="text-neutral-500">Your cart is empty.</p>
          <Link href="/products" className="inline-block mt-6 text-sm underline">
            Continue shopping
          </Link>
        </div>
      ) : lines.length === 0 ? (
        <p className="text-neutral-500">Your cart items are no longer available.</p>
      ) : (
        <>
          {Object.entries(grouped).map(([vendor, vendorItems]) => (
            <div key={vendor} className="mb-10">
              <div className="text-sm font-medium text-neutral-500 mb-4 uppercase tracking-wide">{vendor}</div>
              <div className="space-y-4">
                {vendorItems.map((item) => (
                  <div key={item.productId} className="flex gap-5 py-3">
                    <div className="w-16 h-20 bg-neutral-100 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.product.name}</div>
                      <div className="mt-1 text-sm text-neutral-500">{formatInr(item.product.price)}</div>
                      {item.outOfStock && <div className="mt-1 text-xs text-red-700">Out of stock</div>}
                      <div className="mt-3 flex items-center gap-3">
                        <label className="text-xs text-neutral-500">
                          Qty
                          <input
                            type="number"
                            min={1}
                            max={Math.max(item.stock, 0)}
                            value={item.quantity}
                            onChange={(e) => updateCartQuantity(item.productId, Number(e.target.value), item.stock)}
                            className="ml-2 w-16 px-2 py-1 border border-neutral-200 rounded"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.productId, 0)}
                          className="text-xs underline text-neutral-500"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="text-sm font-medium">{formatInr(item.lineTotal)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {missing && (
            <p className="text-xs text-amber-700 mb-4">Some saved items are no longer available and were left out of the total.</p>
          )}
          <div className="mt-10 pt-6 border-t border-neutral-200 flex justify-between text-lg">
            <span>Total</span>
            <span className="font-medium">{formatInr(total)}</span>
          </div>
          <Link
            href="/checkout"
            className="mt-8 w-full py-4 bg-neutral-900 text-white text-sm font-medium rounded-full hover:bg-neutral-800 transition-colors block text-center"
          >
            Checkout
          </Link>
          <p className="mt-4 text-xs text-neutral-500 text-center">
            Items from multiple vendors will be fulfilled separately. The payable total is confirmed at checkout from current catalog prices.
          </p>
        </>
      )}
    </div>
  );
}
