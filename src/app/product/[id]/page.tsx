import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { getProductById } from "@/lib/catalog";
import AddToCartButton from "@/components/AddToCartButton";

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-6 py-16 text-neutral-500">Loading...</div>}>
      <ProductDetails params={params} />
    </Suspense>
  );
}

async function ProductDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getProductById(id);
  if (!result) notFound();

  const { product, reviews: productReviews, recommended: recommendedProducts } = result;
  const bestOffer = product.offers?.[0] || { vendor: product.vendor, price: product.price, delivery: "3-5 days" };

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-8 py-16">
      <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
        <div className="aspect-square bg-neutral-50 dark:bg-neutral-900 rounded-2xl overflow-hidden">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        </div>

        <div className="flex flex-col">
          <Link href={`/vendor/${product.vendorId}`} className="text-xs tracking-widest text-neutral-500 uppercase hover:text-neutral-900">
            {product.vendor}
          </Link>
          <h1 className="mt-3 text-3xl md:text-4xl font-light tracking-tight">{product.name}</h1>

          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <div className="text-2xl">${bestOffer.price}</div>
            {(product.stock ?? 0) <= 0 ? (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">Out of stock</span>
            ) : product.stock <= 5 ? (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Only {product.stock} left</span>
            ) : null}
            <div className="text-sm text-neutral-500">★ {product.rating} · {product.reviews} reviews</div>
            {product.fastDelivery && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Fast Delivery</span>
            )}
            <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Assured</span>
          </div>

          <div className="mt-6 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl text-sm">
            <div className="font-medium mb-2">EMI Options</div>
            <div className="text-neutral-600 dark:text-neutral-400">
              No Cost EMI from ₹{(bestOffer.price / 6).toFixed(0)}/month · 3, 6, 9, 12 months
            </div>
          </div>

          <p className="mt-6 text-neutral-600 dark:text-neutral-400 leading-relaxed">
            A carefully considered piece from {product.vendor}. Designed for everyday elegance with exceptional materials and craftsmanship.
          </p>

          {product.offers && product.offers.length > 1 && (
            <div className="mt-8 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
              <div className="text-sm font-medium mb-3">Other offers</div>
              <div className="space-y-3">
                {product.offers.map((offer, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <div>
                      <div className="font-medium">{offer.vendor}</div>
                      <div className="text-xs text-neutral-500">★ {offer.rating} · {offer.delivery}</div>
                    </div>
                    <div className="font-medium">${offer.price}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <AddToCartButton productId={product.id} price={bestOffer.price} stock={product.stock ?? 0} />
            {(product.stock ?? 0) <= 0 && (
              <div className="text-sm text-red-700 self-center">Out of stock</div>
            )}
            <a
              href={`https://wa.me/?text=Check%20out%20${encodeURIComponent(product.name)}%20on%20Aether`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-10 py-3.5 border border-neutral-300 text-sm font-medium rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-center"
            >
              Share on WhatsApp
            </a>
          </div>

          <div className="mt-6 text-sm text-neutral-500">
            Sold by <Link href={`/vendor/${product.vendorId}`} className="underline">{bestOffer.vendor}</Link> · Ships in {bestOffer.delivery}
          </div>
        </div>
      </div>

      {productReviews.length > 0 && (
        <div className="mt-24 pt-12 border-t border-neutral-100 dark:border-neutral-800">
          <h2 className="text-2xl font-light mb-8">Customer Reviews</h2>
          <div className="space-y-8 max-w-2xl">
            {productReviews.map((review, i) => (
              <div key={i}>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm">{review.name}</span>
                  <span className="text-sm text-neutral-500">★ {review.rating}</span>
                </div>
                <p className="mt-2 text-neutral-600 dark:text-neutral-400">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {recommendedProducts.length > 0 && (
        <div className="mt-24 pt-12 border-t border-neutral-100 dark:border-neutral-800">
          <h2 className="text-2xl font-light mb-8">Customers also viewed</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            {recommendedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
