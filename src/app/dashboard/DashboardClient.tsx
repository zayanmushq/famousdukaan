"use client";

import { useState } from "react";
import { formatInr } from "@/lib/money";
import { fulfillmentLabel } from "@/lib/order-status";

export type DashboardProduct = {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  lowStockThreshold: number;
  price: number;
  status: string;
  images: string[];
};

export type DashboardFulfillment = {
  id: string;
  status: string;
  trackingNumber: string | null;
  items: { id: string; quantity: number; product: { name: string } }[];
  order: {
    id: string;
    orderNo: string;
    paymentStatus: string;
    status: string;
    createdAt: string;
    customerName: string;
    city: string;
    pincode: string;
  };
};

export default function DashboardClient({
  storeName,
  vendorStatus,
  products: initialProducts,
  fulfillments: initialFulfillments,
}: {
  storeName?: string | null;
  vendorStatus?: string | null;
  products: DashboardProduct[];
  fulfillments: DashboardFulfillment[];
}) {
  const [tab, setTab] = useState<"orders" | "inventory">("orders");
  const [products, setProducts] = useState(initialProducts);
  const [fulfillments, setFulfillments] = useState(initialFulfillments);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [tracking, setTracking] = useState<Record<string, string>>({});

  async function refresh() {
    const [productRes, fulfillmentRes] = await Promise.all([
      fetch("/api/vendor/products"),
      fetch("/api/vendor/fulfillments"),
    ]);
    if (productRes.ok) {
      const data = await productRes.json() as { products?: DashboardProduct[] };
      setProducts(data.products || []);
    }
    if (fulfillmentRes.ok) {
      const data = await fulfillmentRes.json() as { fulfillments?: DashboardFulfillment[] };
      setFulfillments((data.fulfillments || []).map((row) => ({
        ...row,
        order: { ...row.order, createdAt: typeof row.order.createdAt === "string" ? row.order.createdAt : new Date(row.order.createdAt).toISOString() },
      })));
    }
  }

  async function saveProduct(product: DashboardProduct, patch: Partial<DashboardProduct>) {
    setError("");
    setBusy(product.id);
    try {
      const res = await fetch(`/api/vendor/products/${product.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not update inventory");
        return;
      }
      await refresh();
    } catch {
      setError("Could not update inventory");
    } finally {
      setBusy(null);
    }
  }

  async function fulfil(id: string, action: "pack" | "ship" | "deliver") {
    setError("");
    setBusy(id);
    try {
      const res = await fetch(`/api/vendor/fulfillments/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, trackingNumber: tracking[id] }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not update fulfilment");
        return;
      }
      await refresh();
    } catch {
      setError("Could not update fulfilment");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-light tracking-tight mb-2">Vendor Dashboard</h1>
      <p className="text-neutral-500 mb-4">{storeName || "Your store"} · Store management</p>
      {vendorStatus === "PENDING" && (
        <div className="mb-10 p-4 border border-amber-200 bg-amber-50 text-amber-900 rounded-xl text-sm">
          Your seller account is pending approval. You can view the dashboard, but inventory changes and fulfilment are available after an admin approves your store.
        </div>
      )}

      <div className="flex gap-2 mb-8 border-b border-neutral-200">
        {(["orders", "inventory"] as const).map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`px-4 py-2 text-sm capitalize ${tab === item ? "border-b-2 border-neutral-900 font-medium" : "text-neutral-500"}`}
          >
            {item}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {tab === "inventory" && (
        <div className="border border-neutral-200 rounded-xl overflow-hidden">
          {products.length === 0 ? (
            <p className="p-6 text-neutral-500">No products yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="text-left p-4 font-medium">Product</th>
                  <th className="text-left p-4 font-medium">SKU</th>
                  <th className="text-left p-4 font-medium">Stock</th>
                  <th className="text-left p-4 font-medium">Low-stock at</th>
                  <th className="text-left p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-t border-neutral-100">
                    <td className="p-4 font-medium">
                      {product.name}
                      <div className="text-xs text-neutral-500">{formatInr(product.price)}</div>
                    </td>
                    <td className="p-4">
                      <input
                        defaultValue={product.sku || ""}
                        disabled={busy === product.id || vendorStatus === "PENDING"}
                        onBlur={(e) => {
                          const sku = e.target.value.trim() || null;
                          if (sku !== product.sku) saveProduct(product, { sku });
                        }}
                        className="w-32 px-2 py-1 border border-neutral-200 rounded"
                      />
                    </td>
                    <td className="p-4">
                      <input
                        type="number"
                        min={0}
                        defaultValue={product.stock}
                        disabled={busy === product.id || vendorStatus === "PENDING"}
                        onBlur={(e) => {
                          const stock = Number(e.target.value);
                          if (Number.isInteger(stock) && stock !== product.stock) saveProduct(product, { stock });
                        }}
                        className={`w-20 px-2 py-1 border rounded ${product.stock <= product.lowStockThreshold ? "border-amber-400 bg-amber-50" : "border-neutral-200"}`}
                      />
                      {product.stock <= product.lowStockThreshold && (
                        <div className="text-xs text-amber-700 mt-1">Low stock</div>
                      )}
                    </td>
                    <td className="p-4">
                      <input
                        type="number"
                        min={0}
                        defaultValue={product.lowStockThreshold}
                        disabled={busy === product.id || vendorStatus === "PENDING"}
                        onBlur={(e) => {
                          const lowStockThreshold = Number(e.target.value);
                          if (Number.isInteger(lowStockThreshold) && lowStockThreshold !== product.lowStockThreshold) {
                            saveProduct(product, { lowStockThreshold });
                          }
                        }}
                        className="w-20 px-2 py-1 border border-neutral-200 rounded"
                      />
                    </td>
                    <td className="p-4">{product.status.replaceAll("_", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "orders" && (
        <div className="space-y-4">
          {fulfillments.length === 0 ? (
            <p className="text-neutral-500">No order items yet.</p>
          ) : fulfillments.map((row) => (
            <div key={row.id} className="border border-neutral-200 rounded-xl p-5 space-y-3">
              <div className="flex justify-between gap-4">
                <div>
                  <div className="font-medium">{row.order.orderNo}</div>
                  <div className="text-sm text-neutral-500">
                    {row.order.customerName} · {row.order.city} {row.order.pincode}
                  </div>
                </div>
                <div className="text-sm text-right">
                  <div>{fulfillmentLabel(row.status)}</div>
                  <div className="text-xs text-neutral-500">{row.order.paymentStatus}</div>
                </div>
              </div>
              <ul className="text-sm text-neutral-700 list-disc pl-5">
                {row.items.map((item) => (
                  <li key={item.id}>{item.product.name} × {item.quantity}</li>
                ))}
              </ul>
              {row.order.paymentStatus === "PAID" && row.status !== "CANCELLED" && row.status !== "DELIVERED" && vendorStatus !== "PENDING" && (
                <div className="flex flex-wrap items-center gap-3">
                  {row.status === "CONFIRMED" && (
                    <button type="button" disabled={busy === row.id} onClick={() => fulfil(row.id, "pack")} className="text-sm underline disabled:opacity-50">
                      Mark packed
                    </button>
                  )}
                  {row.status === "PACKED" && (
                    <>
                      <input
                        placeholder="Tracking number"
                        value={tracking[row.id] ?? row.trackingNumber ?? ""}
                        onChange={(e) => setTracking((current) => ({ ...current, [row.id]: e.target.value }))}
                        className="px-3 py-1.5 border border-neutral-200 rounded text-sm"
                      />
                      <button type="button" disabled={busy === row.id} onClick={() => fulfil(row.id, "ship")} className="text-sm underline disabled:opacity-50">
                        Mark shipped
                      </button>
                    </>
                  )}
                  {row.status === "SHIPPED" && (
                    <button type="button" disabled={busy === row.id} onClick={() => fulfil(row.id, "deliver")} className="text-sm underline disabled:opacity-50">
                      Mark delivered
                    </button>
                  )}
                </div>
              )}
              {row.trackingNumber && <div className="text-xs text-neutral-500">Tracking: {row.trackingNumber}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
