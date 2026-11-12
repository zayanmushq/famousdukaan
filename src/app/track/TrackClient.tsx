"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { paymentLabel } from "@/lib/order-status";

type TimelineStep = { key: string; label: string; done: boolean; at: string | null };
type TrackedOrder = {
  orderNo: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  cancelledAt: string | null;
  fulfillments: {
    vendorName: string;
    status: string;
    trackingNumber: string | null;
    items: { name: string; quantity: number }[];
    timeline: TimelineStep[];
  }[];
};

export default function TrackClient() {
  const searchParams = useSearchParams();
  const [orderNo, setOrderNo] = useState(searchParams.get("orderNo") || "");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [error, setError] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookup(nextOrderNo = orderNo, nextLast4 = phoneLast4) {
    setError("");
    setLoading(true);
    setOrder(null);
    try {
      const params = new URLSearchParams({ orderNo: nextOrderNo.trim() });
      if (nextLast4.trim()) params.set("phoneLast4", nextLast4.trim());
      const res = await fetch(`/api/track?${params.toString()}`);
      const data = await res.json() as { error?: string; order?: TrackedOrder };
      if (!res.ok || !data.order) {
        setError(data.error || "Order not found");
        return;
      }
      setOrder(data.order);
    } catch {
      setError("Could not load this order");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initial = searchParams.get("orderNo");
    if (initial) {
      setOrderNo(initial);
      void lookup(initial, "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void lookup();
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-light tracking-tight mb-2">Track Order</h1>
      <p className="text-neutral-500 mb-8">Enter your order number. If you are not logged in, also enter the last 4 digits of the shipping phone number.</p>

      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 mb-12">
        <input
          type="text"
          placeholder="e.g. FD-20261112-ABC123"
          value={orderNo}
          onChange={(e) => setOrderNo(e.target.value)}
          className="flex-1 px-4 py-3 border border-neutral-200 rounded-full text-sm"
          required
        />
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          placeholder="Phone last 4"
          value={phoneLast4}
          onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
          className="sm:w-36 px-4 py-3 border border-neutral-200 rounded-full text-sm"
        />
        <button type="submit" disabled={loading} className="px-6 py-3 bg-neutral-900 text-white text-sm rounded-full disabled:opacity-60">
          {loading ? "Tracking..." : "Track"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600 mb-6">{error}</p>}

      {order && (
        <div className="space-y-6">
          <div className="border border-neutral-200 rounded-2xl p-6">
            <div className="mb-2 font-medium">Order {order.orderNo}</div>
            <div className="text-sm text-neutral-500">
              {paymentLabel(order.paymentStatus, order.status)}
              {order.cancelledAt ? " · Cancelled" : ""}
            </div>
          </div>
          {order.fulfillments.map((fulfillment, index) => (
            <div key={`${fulfillment.vendorName}-${index}`} className="border border-neutral-200 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <div className="font-medium">{fulfillment.vendorName}</div>
                  <div className="text-sm text-neutral-500">
                    {fulfillment.items.map((item) => `${item.name} × ${item.quantity}`).join(", ")}
                  </div>
                </div>
                {fulfillment.trackingNumber && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full">{fulfillment.trackingNumber}</span>
                )}
              </div>
              <div className="space-y-6">
                {fulfillment.timeline.map((step) => (
                  <div key={step.key} className="flex items-start gap-4">
                    <div className={`w-3 h-3 mt-1.5 rounded-full ${step.done ? "bg-green-500" : "bg-neutral-300"}`} />
                    <div>
                      <div className={`text-sm ${step.done ? "font-medium" : "text-neutral-500"}`}>{step.label}</div>
                      {step.at && <div className="text-xs text-neutral-400">{new Date(step.at).toLocaleString("en-IN")}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
