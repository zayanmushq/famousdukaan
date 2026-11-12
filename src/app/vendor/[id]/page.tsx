import { Suspense } from "react";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { getVendorById } from "@/lib/catalog";

export default function VendorPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-6 py-16 text-neutral-500">Loading...</div>}>
      <VendorDetails params={params} />
    </Suspense>
  );
}

async function VendorDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getVendorById(id);
  if (!result) notFound();

  const { vendor, products: vendorProducts } = result;

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
