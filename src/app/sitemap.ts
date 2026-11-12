import type { MetadataRoute } from "next";
import { getProducts, getVendors } from "@/lib/catalog";
import { LEGAL_PAGES } from "@/lib/legal";
import { SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ products }, { vendors }] = await Promise.all([getProducts(), getVendors()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/plans`, changeFrequency: "monthly", priority: 0.6 },
    ...LEGAL_PAGES.map((page) => ({
      url: `${SITE_URL}${page.href}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SITE_URL}/product/${product.id}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const vendorRoutes: MetadataRoute.Sitemap = vendors.map((vendor) => ({
    url: `${SITE_URL}/vendor/${vendor.id}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes, ...vendorRoutes];
}
