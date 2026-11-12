import type { Metadata } from "next";
import type { CatalogProduct, CatalogVendor } from "@/lib/catalog";

export const SITE_URL = "https://famousdukaan.com";
export const SITE_NAME = "FamousDukaan";
export const SITE_DESCRIPTION =
  "Simple, minimalist, premium white-label multivendor marketplace";

export const noIndexMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export function absoluteUrl(path = "/"): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/favicon.ico"),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/products?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function productJsonLd(product: CatalogProduct) {
  const url = absoluteUrl(`/product/${product.id}`);
  const offers = (product.offers?.length
    ? product.offers
    : [{ vendor: product.vendor, vendorId: product.vendorId, price: product.price, rating: product.rating, delivery: "3-5 days" }]
  ).map((offer) => ({
    "@type": "Offer",
    url,
    price: offer.price,
    priceCurrency: "USD",
    availability:
      (product.stock ?? 1) > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    seller: {
      "@type": "Organization",
      name: offer.vendor,
    },
  }));

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.image,
    description: `A carefully considered piece from ${product.vendor}. Designed for everyday elegance with exceptional materials and craftsmanship.`,
    brand: { "@type": "Brand", name: product.vendor },
    url,
    offers: offers.length === 1 ? offers[0] : offers,
  };

  if (product.reviews > 0 && product.rating > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviews,
    };
  }

  return data;
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function vendorDescription(vendor: CatalogVendor): string {
  return vendor.description || `Shop ${vendor.name} on ${SITE_NAME}.`;
}
