"use client";

import Link from "next/link";
import { formatInr } from "@/lib/money";
import { paymentLabel } from "@/lib/order-status";

export type CustomerOrder = {
  id: string;
  orderNo: string;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  upiTxnRef: string | null;
};

export default function OrdersClient({ orders }: { orders: CustomerOrder[] }) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-light tracking-tight mb-2">My Orders</h1>
      <p className="text-neutral-500 mb-10">Track and manage your purchases</p>

      {orders.length === 0 ? (
        <div className="border border-neutral-200 rounded-xl p-8 text-center">
          <p className="text-neutral-600">You have no orders yet.</p>
          <Link href="/products" className="inline-block mt-4 text-sm underline">
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const needsPayment = order.paymentStatus === "PENDING" || order.paymentStatus === "REJECTED" || order.paymentStatus === "SUBMITTED";
            const label = paymentLabel(order.paymentStatus, order.status);
            return (
              <div key={order.id} className="border border-neutral-200 rounded-xl p-5 flex justify-between items-center gap-4">
                <div>
                  <div className="font-medium">{order.orderNo}</div>
                  <div className="text-sm text-neutral-500">
                    {new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })} · {formatInr(order.total)}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-sm ${order.paymentStatus === "PAID" ? "text-green-600" : order.paymentStatus === "REJECTED" ? "text-red-600" : "text-blue-600"}`}>
                    {label}
                  </span>
                  {needsPayment && (
                    <Link href={`/checkout/pay/${order.id}`} className="text-sm underline">
                      {order.paymentStatus === "SUBMITTED" ? "View payment" : "Pay"}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
