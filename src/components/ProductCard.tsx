import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: number;
  vendor: string;
  image: string;
  stock?: number;
}

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.id}`} className="group block premium-shadow-hover">
      <div className="aspect-[4/5] bg-neutral-50 dark:bg-neutral-900 rounded-xl overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
        />
      </div>
      <div className="mt-4">
        <div className="text-xs tracking-wide text-neutral-500 dark:text-neutral-400 uppercase">{product.vendor}</div>
        <div className="mt-1.5 text-sm font-medium text-neutral-900 dark:text-neutral-100">{product.name}</div>
        <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">${product.price}</div>
        {(product.stock ?? 1) <= 0 && (
          <div className="mt-1 text-xs text-red-700">Out of stock</div>
        )}
      </div>
    </Link>
  );
}