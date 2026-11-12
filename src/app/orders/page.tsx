import { Suspense } from "react";
import { requireAuth } from "@/lib/auth-guard";
import OrdersClient from "./OrdersClient";

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-6 py-16 text-neutral-500">Loading orders...</div>}>
      <OrdersLoader />
    </Suspense>
  );
}

async function OrdersLoader() {
  await requireAuth("/orders");
  return <OrdersClient />;
}
