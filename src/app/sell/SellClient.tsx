"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { slugifyStoreName } from "@/lib/vendor-validation";

export type SellApplication = {
  storeName: string;
  slug: string;
  description: string;
  contactPhone: string;
  pickupCity: string;
  pickupState: string;
  pickupPincode: string;
  pan: string;
  gstin: string;
  bankAccountHolder: string;
  bankIfsc: string;
  bankAccountMasked: string | null;
  status: string;
  statusReason: string | null;
};

export default function SellClient({
  signedIn,
  userName,
  userEmail,
  application,
}: {
  signedIn: boolean;
  userName: string;
  userEmail: string;
  application: SellApplication | null;
}) {
  const [current, setCurrent] = useState(application);
  const status = current?.status;
  const locked = status === "PENDING" || status === "APPROVED" || status === "SUSPENDED";
  const canReapply = status === "REJECTED";
  const [form, setForm] = useState({
    name: userName,
    email: userEmail,
    password: "",
    storeName: application?.storeName || "",
    slug: application?.slug || "",
    description: application?.description || "",
    contactPhone: application?.contactPhone || "",
    pickupCity: application?.pickupCity || "",
    pickupState: application?.pickupState || "",
    pickupPincode: application?.pickupPincode || "",
    pan: application?.pan || "",
    gstin: application?.gstin || "",
    bankAccountHolder: application?.bankAccountHolder || "",
    bankIfsc: application?.bankIfsc || "",
    bankAccountNumber: "",
  });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "storeName" && (!prev.slug || prev.slug === slugifyStoreName(prev.storeName))) {
        next.slug = slugifyStoreName(value);
      }
      return next;
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/sell", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { error?: string; createdAccount?: boolean; application?: SellApplication };
      if (!res.ok) {
        setError(data.error || "Could not submit application");
        return;
      }
      if (data.createdAccount) {
        await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      }
      if (data.application) setCurrent(data.application);
    } catch {
      setError("Could not submit application");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-light tracking-tight mb-2">Sell on FamousDukaan</h1>
      <p className="text-neutral-500 mb-8">
        Apply with your shop and pickup details. Only approved shops can list products and appear in the catalog.
      </p>

      {status === "PENDING" && (
        <div className="mb-8 p-4 border border-amber-200 bg-amber-50 text-amber-900 rounded-xl text-sm">
          Your application for {current?.storeName} is pending review. We will update this page when an admin decides.
        </div>
      )}
      {status === "APPROVED" && (
        <div className="mb-8 p-4 border border-green-200 bg-green-50 text-green-900 rounded-xl text-sm">
          Your shop is approved. Open the <a href="/dashboard" className="underline">vendor dashboard</a> to manage products.
        </div>
      )}
      {status === "REJECTED" && (
        <div className="mb-8 p-4 border border-red-200 bg-red-50 text-red-900 rounded-xl text-sm">
          Your application was rejected{current?.statusReason ? `: ${current.statusReason}` : "."} You may update the details and apply again.
        </div>
      )}
      {status === "SUSPENDED" && (
        <div className="mb-8 p-4 border border-red-200 bg-red-50 text-red-900 rounded-xl text-sm">
          This shop is suspended{current?.statusReason ? `: ${current.statusReason}` : "."} Contact the store admin if you need a review.
        </div>
      )}

      {!locked && (
        <form onSubmit={onSubmit} className="space-y-4">
          {!signedIn && !current && (
            <>
              <h2 className="text-sm font-medium pt-2">Create your account</h2>
              <input required value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Full name" className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm" />
              <input required type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="Email" className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm" />
              <input required type="password" minLength={8} value={form.password} onChange={(e) => setField("password", e.target.value)} placeholder="Password (min 8 characters)" className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm" />
            </>
          )}
          {!signedIn && !current && (
            <p className="text-sm text-neutral-500">Already have an account? <a href="/login?callbackUrl=/sell" className="underline">Log in</a> first.</p>
          )}

          <h2 className="text-sm font-medium pt-4">Shop details</h2>
          <input required value={form.storeName} onChange={(e) => setField("storeName", e.target.value)} placeholder="Shop name" className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm" />
          <input required value={form.slug} onChange={(e) => setField("slug", e.target.value)} placeholder="Shop slug" className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm" />
          <textarea required minLength={10} value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Describe your shop" className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm min-h-28" />
          <input required value={form.contactPhone} onChange={(e) => setField("contactPhone", e.target.value)} placeholder="Contact phone" className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm" />

          <h2 className="text-sm font-medium pt-4">Pickup address</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <input required value={form.pickupCity} onChange={(e) => setField("pickupCity", e.target.value)} placeholder="City" className="px-4 py-3 border border-neutral-200 rounded-xl text-sm" />
            <input required value={form.pickupState} onChange={(e) => setField("pickupState", e.target.value)} placeholder="State" className="px-4 py-3 border border-neutral-200 rounded-xl text-sm" />
            <input required value={form.pickupPincode} onChange={(e) => setField("pickupPincode", e.target.value)} placeholder="Pincode" className="px-4 py-3 border border-neutral-200 rounded-xl text-sm" />
          </div>

          <h2 className="text-sm font-medium pt-4">Tax and bank details</h2>
          <input required value={form.pan} onChange={(e) => setField("pan", e.target.value.toUpperCase())} placeholder="PAN" className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm" />
          <input value={form.gstin} onChange={(e) => setField("gstin", e.target.value.toUpperCase())} placeholder="GSTIN (optional)" className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm" />
          <input required value={form.bankAccountHolder} onChange={(e) => setField("bankAccountHolder", e.target.value)} placeholder="Account holder name" className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm" />
          <input required value={form.bankIfsc} onChange={(e) => setField("bankIfsc", e.target.value.toUpperCase())} placeholder="IFSC" className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm" />
          <input required={canReapply || !current} value={form.bankAccountNumber} onChange={(e) => setField("bankAccountNumber", e.target.value)} placeholder="Account number" className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm" />
          {current?.bankAccountMasked && (
            <p className="text-xs text-neutral-500">Currently on file: {current.bankAccountMasked}</p>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={pending} className="w-full py-3 bg-neutral-900 text-white text-sm rounded-full disabled:opacity-60">
            {pending ? "Submitting..." : canReapply ? "Submit updated application" : "Submit application"}
          </button>
        </form>
      )}
    </div>
  );
}
