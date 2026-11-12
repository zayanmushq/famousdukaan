import { Suspense } from "react";
import { getProducts } from "@/lib/catalog";
import { requireAuth } from "@/lib/auth-guard";
import WishlistClient from "./WishlistClient";

export default function WishlistPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-6 py-16 text-neutral-500">Loading wishlist...</div>}>
      <WishlistLoader />
    </Suspense>
  );
}

async function WishlistLoader() {
  await requireAuth("/wishlist");
  const { products } = await getProducts();
  return <WishlistClient products={products} />;
}
