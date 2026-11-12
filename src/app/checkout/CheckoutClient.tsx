"use client";

import { useState } from "react";

export default function CheckoutClient() {
  const [payment, setPayment] = useState("cod");

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-light tracking-tight mb-8">Checkout</h1>

      <div className="grid md:grid-cols-2 gap-10">
        <div>
          <h2 className="text-lg font-medium mb-4">Payment Method</h2>
          <div className="space-y-3">
            {[
              { id: "cod", label: "Cash on Delivery", desc: "Pay when you receive" },
              { id: "razorpay", label: "Razorpay / UPI", desc: "Cards, UPI, Netbanking" },
              { id: "stripe", label: "Card Payment", desc: "International cards" },
            ].map((p) => (
              <label
                key={p.id}
                className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer ${
                  payment === p.id ? "border-neutral-900" : "border-neutral-200"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={payment === p.id}
                  onChange={() => setPayment(p.id)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-sm">{p.label}</div>
                  <div className="text-xs text-neutral-500">{p.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="border border-neutral-200 rounded-xl p-6 h-fit">
          <h3 className="font-medium mb-4">Order Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹4,280</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>₹80</span>
            </div>
            <div className="flex justify-between pt-3 border-t font-medium">
              <span>Total</span>
              <span>₹4,360</span>
            </div>
          </div>
          <button className="mt-6 w-full py-3 bg-neutral-900 text-white text-sm rounded-full">
            Place Order
          </button>
          <p className="mt-3 text-xs text-neutral-500 text-center">
            {payment === "cod" ? "You will pay ₹4,360 on delivery" : "Secure payment"}
          </p>
        </div>
      </div>
    </div>
  );
}