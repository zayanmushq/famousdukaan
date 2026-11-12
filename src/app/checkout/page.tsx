import { Suspense } from "react";
import { requireAuth } from "@/lib/auth-guard";
import CheckoutClient from "./CheckoutClient";

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-6 py-16 text-neutral-500">Loading checkout...</div>}>
      <CheckoutLoader />
    </Suspense>
  );
}

async function CheckoutLoader() {
  await requireAuth("/checkout");
  return <CheckoutClient />;
}
