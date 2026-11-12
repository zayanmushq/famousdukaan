"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clearCart, getCart, type CartItem } from "@/lib/cart";
import { formatInr } from "@/lib/money";

type CatalogProduct = { id: string; name: string; price: number; vendor: string };

const emptyAddress = { name: "", phone: "", address: "", city: "", pincode: "" };

export default function CheckoutClient() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [address, setAddress] = useState(emptyAddress);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCart(getCart());
    fetch("/api/products")
      .then((res) => res.json())
      .then((data: { products?: CatalogProduct[] }) => setProducts(data.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoaded(true));
  }, []);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const lines = cart
    .map((item) => {
      const product = productMap.get(item.productId);
      if (!product) return null;
      return { ...item, product, lineTotal: product.price * item.quantity };
    })
    .filter((line): line is NonNullable<typeof line> => line !== null);
  const estimatedTotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (lines.length === 0) {
      setError("Your cart is empty.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
          shippingAddress: address,
          // Client prices are ignored by the server; totals come from DB product prices.
          clientTotal: estimatedTotal,
        }),
      });
      const data = await res.json() as { error?: string; order?: { id: string } };
      if (!res.ok || !data.order?.id) {
        setError(data.error || "Could not place the order.");
        return;
      }
      clearCart();
      router.push(`/checkout/pay/${data.order.id}`);
    } catch {
      setError("Could not place the order.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded) {
    return <div className="max-w-3xl mx-auto px-6 py-16 text-neutral-500">Loading checkout...</div>;
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-light tracking-tight mb-4">Checkout</h1>
        <p className="text-neutral-500">Your cart is empty.</p>
        <Link href="/products" className="inline-block mt-6 text-sm underline">Continue shopping</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-light tracking-tight mb-8">Checkout</h1>
      <form onSubmit={onSubmit} className="grid md:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-medium mb-4">Shipping address</h2>
            <div className="space-y-3">
              {([
                ["name", "Full name", "text"],
                ["phone", "Phone", "tel"],
                ["address", "Address", "text"],
                ["city", "City", "text"],
                ["pincode", "Pincode", "text"],
              ] as const).map(([key, label, type]) => (
                <label key={key} className="block text-sm">
                  <span className="block mb-1 text-neutral-600">{label}</span>
                  <input
                    required
                    type={type}
                    value={address[key]}
                    onChange={(e) => setAddress((current) => ({ ...current, [key]: e.target.value }))}
                    className="w-full px-4 py-2 border border-neutral-200 rounded-lg"
                  />
                </label>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-medium mb-2">Payment method</h2>
            <div className="p-4 border border-neutral-900 rounded-xl">
              <div className="font-medium text-sm">UPI</div>
              <div className="text-xs text-neutral-500 mt-1">
                You will get a UPI QR code and payment link on the next page. Payment is verified manually.
              </div>
            </div>
          </div>
        </div>

        <div className="border border-neutral-200 rounded-xl p-6 h-fit">
          <h3 className="font-medium mb-4">Order summary</h3>
          <div className="space-y-3 text-sm">
            {lines.map((line) => (
              <div key={line.productId} className="flex justify-between gap-4">
                <span>{line.product.name} × {line.quantity}</span>
                <span>{formatInr(line.lineTotal)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-3 border-t font-medium">
              <span>Total</span>
              <span>{formatInr(estimatedTotal)}</span>
            </div>
          </div>
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting || lines.length === 0}
            className="mt-6 w-full py-3 bg-neutral-900 text-white text-sm rounded-full disabled:opacity-60"
          >
            {submitting ? "Placing order..." : "Place order"}
          </button>
          <p className="mt-3 text-xs text-neutral-500 text-center">
            The final amount is calculated on the server from current catalog prices.
          </p>
        </div>
      </form>
    </div>
  );
}
