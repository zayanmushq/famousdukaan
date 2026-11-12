import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProductCard from "@/components/ProductCard";
import { getVendorById } from "@/lib/catalog";
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd, SITE_NAME, SITE_URL, vendorDescription } from "@/lib/seo";

type VendorPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: VendorPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getVendorById(id);
  if (!result) {
    return { title: "Vendor not found", robots: { index: false, follow: false } };
  }

  const { vendor } = result;
  const description = vendorDescription(vendor);
  const url = `${SITE_URL}/vendor/${vendor.id}`;

  return {
    title: vendor.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: vendor.name,
      description,
      url,
      siteName: SITE_NAME,
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: vendor.name,
      description,
    },
  };
}

export default function VendorPage({ params }: VendorPageProps) {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-6 py-16 text-neutral-500">Loading...</div>}>
      <VendorDetails params={params} />
    </Suspense>
  );
}

async function VendorDetails({ params }: VendorPageProps) {
  const { id } = await params;
  const result = await getVendorById(id);
  if (!result) notFound();

  const { vendor, products: vendorProducts } = result;

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: vendor.name, path: `/vendor/${vendor.id}` },
        ])}
      />
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
