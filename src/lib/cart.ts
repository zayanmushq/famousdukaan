export type CartItem = { productId: string; quantity: number };

export const CART_STORAGE_KEY = "famousdukaan-cart";

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as { productId?: unknown; quantity?: unknown };
        const productId = String(row.productId || "");
        const quantity = Number(row.quantity);
        if (!productId || !Number.isInteger(quantity) || quantity < 1) return null;
        return { productId, quantity: Math.min(quantity, 99) };
      })
      .filter((item): item is CartItem => item !== null);
  } catch {
    return [];
  }
}

export function setCart(items: CartItem[]) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("famousdukaan-cart-changed"));
}

export function addToCart(productId: string, quantity = 1) {
  const qty = Math.min(Math.max(1, Math.floor(quantity)), 99);
  const items = getCart();
  const existing = items.find((item) => item.productId === productId);
  if (existing) {
    existing.quantity = Math.min(existing.quantity + qty, 99);
  } else {
    items.push({ productId, quantity: qty });
  }
  setCart(items);
  return items;
}

export function updateCartQuantity(productId: string, quantity: number) {
  const qty = Math.floor(quantity);
  if (qty < 1) {
    setCart(getCart().filter((item) => item.productId !== productId));
    return;
  }
  setCart(
    getCart().map((item) =>
      item.productId === productId ? { ...item, quantity: Math.min(qty, 99) } : item
    )
  );
}

export function clearCart() {
  setCart([]);
}
