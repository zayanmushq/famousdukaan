"use client";

import { useState } from "react";

const plans = [
  { id: "free", name: "Free", price: 0, commission: 15, products: 10, features: ["Basic store", "COD support"] },
  { id: "basic", name: "Basic", price: 999, commission: 10, products: 100, features: ["WhatsApp integration", "Analytics", "Priority support"] },
  { id: "premium", name: "Premium", price: 2499, commission: 7, products: "Unlimited", features: ["Custom domain", "Advanced shipping", "Dedicated support"] },
];

export default function VendorPlansPage() {
  const [selected, setSelected] = useState("basic");

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-light tracking-tight text-center mb-2">Choose Your Plan</h1>
      <p className="text-center text-neutral-500 mb-12">Start selling in minutes. Upgrade anytime.</p>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            onClick={() => setSelected(plan.id)}
            className={`p-6 border rounded-2xl cursor-pointer transition-all ${
              selected === plan.id
                ? "border-neutral-900 bg-neutral-50 dark:bg-neutral-900"
                : "border-neutral-200 hover:border-neutral-400"
            }`}
          >
            <div className="text-lg font-medium">{plan.name}</div>
            <div className="mt-2 text-3xl font-light">
              {plan.price === 0 ? "Free" : `₹${plan.price}`}
              {plan.price > 0 && <span className="text-sm text-neutral-500">/mo</span>}
            </div>
            <div className="mt-4 text-sm text-neutral-500">{plan.commission}% commission</div>
            <div className="mt-1 text-sm text-neutral-500">{plan.products} products</div>
            <ul className="mt-6 space-y-2 text-sm">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> {f}
                </li>
              ))}
            </ul>
            <button className="mt-6 w-full py-2.5 bg-neutral-900 text-white text-sm rounded-full">
              {selected === plan.id ? "Selected" : "Select Plan"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}