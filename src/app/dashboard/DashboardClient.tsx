"use client";

import { useState, type FormEvent } from "react";
import { formatInr } from "@/lib/money";
import { fulfillmentLabel } from "@/lib/order-status";

export type DashboardProduct = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  sku: string | null;
  stock: number;
  lowStockThreshold: number;
  price: number;
  comparePrice: number | null;
  status: string;
  images: string[];
  countryOfOrigin: string | null;
};

export type DashboardCategory = { id: string; slug: string; name: string };

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

type ProductFormState = {
  name: string;
  description: string;
  category: string;
  price: string;
  comparePrice: string;
  stock: string;
  images: string;
  countryOfOrigin: string;
  status: string;
};

const emptyForm = (category: string): ProductFormState => ({
  name: "",
  description: "",
  category,
  price: "",
  comparePrice: "",
  stock: "0",
  images: "",
  countryOfOrigin: "",
  status: "DRAFT",
});

function formFromProduct(product: DashboardProduct): ProductFormState {
  return {
    name: product.name,
    description: product.description || "",
    category: product.category,
    price: String(product.price),
    comparePrice: product.comparePrice != null ? String(product.comparePrice) : "",
    stock: String(product.stock),
    images: product.images.join("\n"),
    countryOfOrigin: product.countryOfOrigin || "",
    status: product.status === "OUT_OF_STOCK" ? "ACTIVE" : product.status,
  };
}

export default function DashboardClient({
  storeName,
  vendorStatus,
  products: initialProducts,
  fulfillments: initialFulfillments,
  categories,
}: {
  storeName?: string | null;
  vendorStatus?: string | null;
  products: DashboardProduct[];
  fulfillments: DashboardFulfillment[];
  categories: DashboardCategory[];
}) {
  const [tab, setTab] = useState<"orders" | "products" | "inventory">("orders");
  const [products, setProducts] = useState(initialProducts);
  const [fulfillments, setFulfillments] = useState(initialFulfillments);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm(categories[0]?.name || ""));
  const [message, setMessage] = useState("");
  const approved = vendorStatus === "APPROVED";

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

  function openCreate() {
    setEditingId("new");
    setForm(emptyForm(categories[0]?.name || ""));
    setMessage("");
    setError("");
  }

  function openEdit(product: DashboardProduct) {
    setEditingId(product.id);
    setForm(formFromProduct(product));
    setMessage("");
    setError("");
  }

  async function submitProduct(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy("form");
    const payload = {
      name: form.name,
      description: form.description,
      category: form.category,
      price: Number(form.price),
      comparePrice: form.comparePrice === "" ? null : Number(form.comparePrice),
      stock: Number(form.stock),
      images: form.images.split(/[\n,]+/).map((value) => value.trim()).filter(Boolean),
      countryOfOrigin: form.countryOfOrigin,
      status: form.status,
    };
    try {
      const res = await fetch(editingId && editingId !== "new" ? `/api/vendor/products/${editingId}` : "/api/vendor/products", {
        method: editingId && editingId !== "new" ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not save product");
        return;
      }
      setMessage(editingId === "new" ? "Product created." : "Product updated.");
      setEditingId(null);
      await refresh();
    } catch {
      setError("Could not save product");
    } finally {
      setBusy(null);
    }
  }

  async function archiveProduct(product: DashboardProduct) {
    if (!confirm(`Archive ${product.name}? It will be hidden from the catalog.`)) return;
    await saveProduct(product, { status: "ARCHIVED" });
  }

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-light tracking-tight mb-2">Vendor Dashboard</h1>
      <p className="text-neutral-500 mb-4">{storeName || "Your store"} · Store management</p>
      {vendorStatus && vendorStatus !== "APPROVED" && (
        <div className="mb-10 p-4 border border-amber-200 bg-amber-50 text-amber-900 rounded-xl text-sm">
          Your shop status is {vendorStatus}. Product and inventory changes are available only after approval.
        </div>
      )}

      <div className="flex gap-2 mb-8 border-b border-neutral-200">
        {(["orders", "products", "inventory"] as const).map((item) => (
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
      {message && <p className="text-sm text-green-700 mb-4">{message}</p>}

      {tab === "products" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium">Your products</h2>
            {approved && (
              <button type="button" onClick={openCreate} className="text-sm underline">
                Add product
              </button>
            )}
          </div>
          {editingId && (
            <form onSubmit={submitProduct} className="border border-neutral-200 rounded-xl p-5 space-y-3">
              <h3 className="font-medium">{editingId === "new" ? "New product" : "Edit product"}</h3>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Name" className="w-full px-3 py-2 border border-neutral-200 rounded text-sm" />
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description" className="w-full px-3 py-2 border border-neutral-200 rounded text-sm min-h-24" />
              <div className="grid sm:grid-cols-2 gap-3">
                <select required value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="px-3 py-2 border border-neutral-200 rounded text-sm">
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>{category.name}</option>
                  ))}
                </select>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="px-3 py-2 border border-neutral-200 rounded text-sm">
                  <option value="DRAFT">DRAFT</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
                <input required type="number" min={1} step={1} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="Price (INR)" className="px-3 py-2 border border-neutral-200 rounded text-sm" />
                <input type="number" min={1} step={1} value={form.comparePrice} onChange={(e) => setForm((f) => ({ ...f, comparePrice: e.target.value }))} placeholder="MRP (optional)" className="px-3 py-2 border border-neutral-200 rounded text-sm" />
                <input type="number" min={0} step={1} value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} placeholder="Stock" className="px-3 py-2 border border-neutral-200 rounded text-sm" />
                <input value={form.countryOfOrigin} onChange={(e) => setForm((f) => ({ ...f, countryOfOrigin: e.target.value }))} placeholder="Country of origin" className="px-3 py-2 border border-neutral-200 rounded text-sm" />
              </div>
              <textarea
                value={form.images}
                onChange={(e) => setForm((f) => ({ ...f, images: e.target.value }))}
                placeholder="Image URLs, one per line (upload is not enabled until a storage service role key is configured)"
                className="w-full px-3 py-2 border border-neutral-200 rounded text-sm min-h-24"
              />
              <p className="text-xs text-neutral-500">Paste public https image URLs (JPEG, PNG, or WebP). File upload will appear here once storage is enabled.</p>
              <div className="flex gap-3">
                <button type="submit" disabled={busy === "form"} className="px-4 py-2 bg-neutral-900 text-white text-sm rounded-full disabled:opacity-60">
                  {busy === "form" ? "Saving..." : "Save product"}
                </button>
                <button type="button" onClick={() => setEditingId(null)} className="text-sm underline">Cancel</button>
              </div>
            </form>
          )}
          {products.length === 0 ? (
            <p className="text-neutral-500">No products yet.</p>
          ) : (
            <div className="border border-neutral-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="text-left p-4 font-medium">Product</th>
                    <th className="text-left p-4 font-medium">Category</th>
                    <th className="text-left p-4 font-medium">Price</th>
                    <th className="text-left p-4 font-medium">Stock</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-t border-neutral-100">
                      <td className="p-4 font-medium">{product.name}</td>
                      <td className="p-4">{product.category}</td>
                      <td className="p-4">{formatInr(product.price)}</td>
                      <td className="p-4">{product.stock}</td>
                      <td className="p-4">{product.status}</td>
                      <td className="p-4 space-x-3">
                        {approved && (
                          <>
                            <button type="button" className="text-xs underline" onClick={() => openEdit(product)}>Edit</button>
                            {product.status !== "ARCHIVED" && (
                              <button type="button" className="text-xs underline" onClick={() => void archiveProduct(product)}>Archive</button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
                        disabled={busy === product.id || !approved}
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
                        disabled={busy === product.id || !approved}
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
                        disabled={busy === product.id || !approved}
                        onBlur={(e) => {
                          const lowStockThreshold = Number(e.target.value);
                          if (Number.isInteger(lowStockThreshold) && lowStockThreshold !== product.lowStockThreshold) {
                            saveProduct(product, { lowStockThreshold });
                          }
                        }}
                        className="w-20 px-2 py-1 border border-neutral-200 rounded"
                      />
                    </td>
                    <td className="p-4">{product.status}</td>
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
            <p className="text-neutral-500">No orders yet.</p>
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
              {row.order.paymentStatus === "PAID" && row.status !== "CANCELLED" && row.status !== "DELIVERED" && approved && (
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
