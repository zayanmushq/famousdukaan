"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatInr } from "@/lib/money";

type Props = {
  orderId: string;
  orderNo: string;
  total: number;
  paymentStatus: string;
  upiUri: string;
  qrDataUrl: string;
  upiTxnRef: string | null;
};

export default function PayClient({
  orderId,
  orderNo,
  total,
  paymentStatus,
  upiUri,
  qrDataUrl,
  upiTxnRef,
}: Props) {
  const router = useRouter();
  const [utr, setUtr] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = paymentStatus === "PENDING" || paymentStatus === "REJECTED";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!/^\d{12}$/.test(utr.trim())) {
      setError("Enter the 12-digit UTR from your payment confirmation.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/utr`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ utr: utr.trim() }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not submit UTR.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not submit UTR.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-light tracking-tight mb-2">Pay with UPI</h1>
      <p className="text-neutral-500 mb-8">Order {orderNo}</p>

      <div className="border border-neutral-200 rounded-xl p-6 space-y-6">
        <div className="flex justify-between text-lg">
          <span>Amount</span>
          <span className="font-medium">{formatInr(total)}</span>
        </div>

        {paymentStatus !== "PAID" && (
          <>
            <div className="flex flex-col items-center gap-4">
              <img src={qrDataUrl} alt="UPI payment QR code" className="w-56 h-56" />
              <p className="text-xs text-neutral-500 text-center">Scan this QR with any UPI app to pay FamousDukaan.</p>
            </div>
            <a
              href={upiUri}
              className="block w-full py-3 bg-neutral-900 text-white text-sm text-center rounded-full"
            >
              Pay with UPI app
            </a>
          </>
        )}

        <div className="rounded-lg bg-amber-50 text-amber-900 text-sm p-4">
          Payment is verified manually. Your order is confirmed only after FamousDukaan verifies the UTR and marks it paid.
        </div>

        {paymentStatus === "PAID" && (
          <p className="text-sm text-green-700">Payment received. Your order is confirmed.</p>
        )}
        {paymentStatus === "SUBMITTED" && (
          <p className="text-sm text-neutral-700">
            UTR {upiTxnRef} has been submitted and is awaiting verification.
          </p>
        )}
        {paymentStatus === "REJECTED" && (
          <p className="text-sm text-red-700">
            The previous UTR was rejected. Please check the amount and submit the correct 12-digit UTR.
          </p>
        )}

        {canSubmit && (
          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block text-sm">
              <span className="block mb-1 text-neutral-600">12-digit UTR / UPI transaction reference</span>
              <input
                value={utr}
                onChange={(e) => setUtr(e.target.value.replace(/\D/g, "").slice(0, 12))}
                inputMode="numeric"
                pattern="\d{12}"
                maxLength={12}
                placeholder="12-digit UTR"
                className="w-full px-4 py-2 border border-neutral-200 rounded-lg"
                required
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 border border-neutral-900 text-sm rounded-full disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "I have paid — submit UTR"}
            </button>
          </form>
        )}
      </div>

      <Link href="/orders" className="inline-block mt-8 text-sm underline">View my orders</Link>
    </div>
  );
}
