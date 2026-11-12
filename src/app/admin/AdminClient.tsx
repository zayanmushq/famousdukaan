"use client";

import { useMemo, useState } from "react";
import { formatInr } from "@/lib/money";

const mockVendors = [
  { id: "v1", name: "Atelier Noir", products: 12, sales: 18420, commission: 1842, status: "Active" },
  { id: "v2", name: "Form Studio", products: 8, sales: 12180, commission: 1461, status: "Active" },
  { id: "v3", name: "Lumen", products: 5, sales: 9650, commission: 965, status: "Pending" },
];

export type AdminPayment = {
  id: string;
  orderNo: string;
  total: number;
  paymentStatus: string;
  status: string;
  upiTxnRef: string | null;
  createdAt: string;
  customerName: string | null;
  customerEmail: string;
};

export type AdminOrder = {
  id: string;
  orderNo: string;
  total: number;
  paymentStatus: string;
  status: string;
  createdAt: string;
  refundMarkedAt: string | null;
  cancelledAt: string | null;
  customerName: string | null;
  customerEmail: string;
  fulfillments: {
    id: string;
    status: string;
    trackingNumber: string | null;
    vendorName: string;
  }[];
};

export default function AdminClient({
  payments: initialPayments,
  orders: initialOrders,
}: {
  payments: AdminPayment[];
  orders: AdminOrder[];
}) {
  const [tab, setTab] = useState("payments");
  const [payments, setPayments] = useState(initialPayments);
  const [orders, setOrders] = useState(initialOrders);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ paymentStatus: "", status: "", vendorId: "" });

  const pendingCount = useMemo(
    () => payments.filter((p) => p.paymentStatus === "PENDING" || p.paymentStatus === "SUBMITTED").length,
    [payments]
  );

  async function refresh() {
    const res = await fetch("/api/admin/payments");
    if (!res.ok) throw new Error("Could not refresh payments");
    const data = await res.json() as { orders?: Array<AdminPayment & { user?: { email?: string; name?: string | null } }> };
    const next = (data.orders || []).map((order) => ({
      id: order.id,
      orderNo: order.orderNo,
      total: order.total,
      paymentStatus: order.paymentStatus,
      status: order.status,
      upiTxnRef: order.upiTxnRef,
      createdAt: typeof order.createdAt === "string" ? order.createdAt : new Date(order.createdAt).toISOString(),
      customerName: order.customerName ?? order.user?.name ?? null,
      customerEmail: order.customerEmail ?? order.user?.email ?? "",
    }));
    setPayments(next);
  }

  async function act(id: string, action: "paid" | "reject") {
    setError("");
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/payments/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error || "Action failed");
        return;
      }
      await refresh();
    } catch {
      setError("Action failed");
    } finally {
      setBusyId(null);
    }
  }

  async function refreshOrders() {
    const params = new URLSearchParams();
    if (filters.paymentStatus) params.set("paymentStatus", filters.paymentStatus);
    if (filters.status) params.set("status", filters.status);
    if (filters.vendorId) params.set("vendorId", filters.vendorId);
    const res = await fetch(`/api/admin/orders?${params.toString()}`);
    if (!res.ok) throw new Error("Could not refresh orders");
    const data = await res.json() as {
      orders?: {
        id: string;
        orderNo: string;
        total: number;
        paymentStatus: string;
        status: string;
        createdAt: string | Date;
        refundMarkedAt?: string | null;
        cancelledAt?: string | null;
        customerName?: string | null;
        customerEmail?: string;
        user?: { email?: string; name?: string | null };
        fulfillments?: { id: string; status: string; trackingNumber: string | null; vendorName?: string; vendor?: { storeName?: string } }[];
      }[];
    };
    setOrders((data.orders || []).map((order) => ({
      id: order.id,
      orderNo: order.orderNo,
      total: order.total,
      paymentStatus: order.paymentStatus,
      status: order.status,
      createdAt: typeof order.createdAt === "string" ? order.createdAt : new Date(order.createdAt).toISOString(),
      refundMarkedAt: order.refundMarkedAt ?? null,
      cancelledAt: order.cancelledAt ?? null,
      customerName: order.customerName ?? order.user?.name ?? null,
      customerEmail: order.customerEmail ?? order.user?.email ?? "",
      fulfillments: (order.fulfillments || []).map((f) => ({
        id: f.id,
        status: f.status,
        trackingNumber: f.trackingNumber,
        vendorName: f.vendorName ?? f.vendor?.storeName ?? "Vendor",
      })),
    })));
  }

  async function actOrder(id: string, action: "cancel" | "refund") {
    setError("");
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error || "Action failed");
        return;
      }
      await refreshOrders();
    } catch {
      setError("Action failed");
    } finally {
      setBusyId(null);
    }
  }

  async function overrideFulfillment(orderId: string, fulfillmentId: string, status: string, trackingNumber: string | null) {
    setError("");
    setBusyId(fulfillmentId);
    try {
      const tracking = status === "SHIPPED" ? (trackingNumber || window.prompt("Tracking number") || "") : trackingNumber;
      if (status === "SHIPPED" && !tracking) {
        setError("A tracking number is required to mark shipped");
        return;
      }
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "override", fulfillmentId, status, trackingNumber: tracking }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error || "Override failed");
        return;
      }
      await refreshOrders();
    } catch {
      setError("Override failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-light tracking-tight mb-2">Admin Panel</h1>
      <p className="text-neutral-500 mb-10">Marketplace control center</p>

      <div className="flex gap-2 mb-10 border-b border-neutral-200">
        {["payments", "overview", "vendors", "orders", "settings"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize ${
              tab === t ? "border-b-2 border-neutral-900 font-medium" : "text-neutral-500"
            }`}
          >
            {t}{t === "payments" && pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
        ))}
      </div>

      {tab === "payments" && (
        <div>
          <h2 className="text-lg font-medium mb-4">Pending and submitted payments</h2>
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          {payments.length === 0 ? (
            <p className="text-neutral-500">No payments waiting for review.</p>
          ) : (
            <div className="border border-neutral-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="text-left p-4 font-medium">Order</th>
                    <th className="text-left p-4 font-medium">Customer</th>
                    <th className="text-left p-4 font-medium">Amount</th>
                    <th className="text-left p-4 font-medium">UTR</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((order) => (
                    <tr key={order.id} className="border-t border-neutral-100">
                      <td className="p-4 font-medium">{order.orderNo}</td>
                      <td className="p-4">
                        <div>{order.customerName || "Customer"}</div>
                        <div className="text-xs text-neutral-500">{order.customerEmail}</div>
                      </td>
                      <td className="p-4">{formatInr(order.total)}</td>
                      <td className="p-4 font-mono text-xs">{order.upiTxnRef || "—"}</td>
                      <td className="p-4">{order.paymentStatus}</td>
                      <td className="p-4 space-x-3">
                        <button
                          type="button"
                          disabled={busyId === order.id}
                          onClick={() => act(order.id, "paid")}
                          className="text-xs underline disabled:opacity-50"
                        >
                          Mark Paid
                        </button>
                        <button
                          type="button"
                          disabled={busyId === order.id}
                          onClick={() => act(order.id, "reject")}
                          className="text-xs underline text-red-700 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "overview" && (
        <div className="grid md:grid-cols-4 gap-6">
          <div className="p-6 border border-neutral-200 rounded-xl">
            <div className="text-sm text-neutral-500">Total GMV</div>
            <div className="mt-2 text-2xl font-light">$128,450</div>
          </div>
          <div className="p-6 border border-neutral-200 rounded-xl">
            <div className="text-sm text-neutral-500">Platform Commission</div>
            <div className="mt-2 text-2xl font-light">$12,845</div>
          </div>
          <div className="p-6 border border-neutral-200 rounded-xl">
            <div className="text-sm text-neutral-500">Active Vendors</div>
            <div className="mt-2 text-2xl font-light">42</div>
          </div>
          <div className="p-6 border border-neutral-200 rounded-xl">
            <div className="text-sm text-neutral-500">Pending Approvals</div>
            <div className="mt-2 text-2xl font-light">3</div>
          </div>
        </div>
      )}

      {tab === "vendors" && (
        <div className="border border-neutral-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left p-4 font-medium">Vendor</th>
                <th className="text-left p-4 font-medium">Products</th>
                <th className="text-left p-4 font-medium">Sales</th>
                <th className="text-left p-4 font-medium">Commission</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {mockVendors.map((v) => (
                <tr key={v.id} className="border-t border-neutral-100">
                  <td className="p-4 font-medium">{v.name}</td>
                  <td className="p-4">{v.products}</td>
                  <td className="p-4">${v.sales.toLocaleString()}</td>
                  <td className="p-4">${v.commission.toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${v.status === "Active" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <button className="text-xs underline">Manage</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "orders" && (
        <div>
          <div className="flex flex-wrap gap-3 mb-4">
            <select
              value={filters.paymentStatus}
              onChange={(e) => setFilters((f) => ({ ...f, paymentStatus: e.target.value }))}
              className="px-3 py-2 border border-neutral-200 rounded text-sm"
            >
              <option value="">All payments</option>
              {["PENDING", "SUBMITTED", "PAID", "REJECTED"].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="px-3 py-2 border border-neutral-200 rounded text-sm"
            >
              <option value="">All statuses</option>
              {["PENDING_PAYMENT", "CONFIRMED", "PACKED", "PARTIALLY_SHIPPED", "SHIPPED", "PARTIALLY_DELIVERED", "DELIVERED", "CANCELLED"].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <button type="button" onClick={() => void refreshOrders()} className="text-sm underline">Apply filters</button>
          </div>
          {orders.length === 0 ? (
            <p className="text-neutral-500">No orders match these filters.</p>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="border border-neutral-200 rounded-xl p-5 space-y-3">
                  <div className="flex justify-between gap-4">
                    <div>
                      <div className="font-medium">{order.orderNo}</div>
                      <div className="text-sm text-neutral-500">
                        {order.customerName || "Customer"} · {order.customerEmail} · {formatInr(order.total)}
                      </div>
                    </div>
                    <div className="text-sm text-right">
                      <div>{order.status}</div>
                      <div className="text-xs text-neutral-500">{order.paymentStatus}{order.refundMarkedAt ? " · refund marked" : ""}</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    {order.fulfillments.map((f) => (
                      <div key={f.id} className="flex flex-wrap items-center gap-3">
                        <span>{f.vendorName}: {f.status}{f.trackingNumber ? ` · ${f.trackingNumber}` : ""}</span>
                        <select
                          defaultValue={f.status}
                          disabled={busyId === f.id || busyId === order.id}
                          onChange={(e) => void overrideFulfillment(order.id, f.id, e.target.value, f.trackingNumber)}
                          className="px-2 py-1 border border-neutral-200 rounded text-xs"
                        >
                          {["AWAITING_PAYMENT", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"].map((value) => (
                            <option key={value} value={value}>{value}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="space-x-4 text-sm">
                    {order.status !== "CANCELLED" && (
                      <button type="button" disabled={busyId === order.id} onClick={() => void actOrder(order.id, "cancel")} className="underline disabled:opacity-50">
                        Cancel
                      </button>
                    )}
                    {order.paymentStatus === "PAID" && !order.refundMarkedAt && (
                      <button type="button" disabled={busyId === order.id} onClick={() => void actOrder(order.id, "refund")} className="underline disabled:opacity-50">
                        Mark refunded
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "settings" && (
        <div className="max-w-md space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Default Commission Rate (%)</label>
            <input type="number" defaultValue={10} className="w-full px-4 py-2 border border-neutral-200 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Minimum Payout Amount</label>
            <input type="number" defaultValue={50} className="w-full px-4 py-2 border border-neutral-200 rounded-lg" />
          </div>
          <button className="px-6 py-2.5 bg-neutral-900 text-white text-sm rounded-full">Save Settings</button>
        </div>
      )}
    </div>
  );
}
