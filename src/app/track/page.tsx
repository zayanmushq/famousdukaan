"use client";

import { useState } from "react";

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState("");
  const [tracked, setTracked] = useState(false);

  const mockOrder = {
    id: "AET-10248",
    status: "Shipped",
    steps: [
      { label: "Order Placed", done: true, date: "Nov 9" },
      { label: "Confirmed", done: true, date: "Nov 9" },
      { label: "Shipped", done: true, date: "Nov 10" },
      { label: "Out for Delivery", done: false, date: "" },
      { label: "Delivered", done: false, date: "" },
    ],
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-light tracking-tight mb-2">Track Order</h1>
      <p className="text-neutral-500 mb-8">Enter your order ID to see status</p>

      <div className="flex gap-3 mb-12">
        <input
          type="text"
          placeholder="e.g. AET-10248"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          className="flex-1 px-4 py-3 border border-neutral-200 rounded-full text-sm"
        />
        <button
          onClick={() => setTracked(true)}
          className="px-6 py-3 bg-neutral-900 text-white text-sm rounded-full"
        >
          Track
        </button>
      </div>

      {tracked && (
        <div className="border border-neutral-200 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <div className="font-medium">Order {mockOrder.id}</div>
              <div className="text-sm text-neutral-500">Status: {mockOrder.status}</div>
            </div>
            <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full">Assured</span>
          </div>

          <div className="space-y-6">
            {mockOrder.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className={`w-3 h-3 mt-1.5 rounded-full ${step.done ? "bg-green-500" : "bg-neutral-300"}`} />
                <div>
                  <div className={`text-sm ${step.done ? "font-medium" : "text-neutral-500"}`}>{step.label}</div>
                  {step.date && <div className="text-xs text-neutral-400">{step.date}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}