import { Suspense } from "react";
import { products, vendors } from "@/lib/data";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";

export function generateStaticParams() {
  return vendors.map((vendor) => ({ id: vendor.id }));
}

export default function VendorPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-6 py-16 text-neutral-500">Loading...</div>}>
      <VendorDetails params={params} />
    </Suspense>
  );
}

async function VendorDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vendor = vendors.find((v) => v.id === id);
  if (!vendor) notFound();

  const vendorProducts = products.filter((p) => p.vendorId === vendor.id);

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="mb-16 text-center">
        <h1 className="text-4xl font-light">{vendor.name}</h1>
        <p className="mt-3 text-neutral-500">{vendor.description}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-12">
        {vendorProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}