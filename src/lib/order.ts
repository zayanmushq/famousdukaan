import { randomBytes } from "crypto";
import { toMoney } from "@/lib/money";

export type ShippingAddress = {
  name: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
};

export type CartLineInput = { productId: string; quantity: number };

export function generateOrderNo(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `FD-${y}${m}${d}-${rand}`;
}

export function parseShippingAddress(input: unknown): ShippingAddress | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  const name = String(row.name || "").trim();
  const phone = String(row.phone || "").replace(/\s+/g, "").trim();
  const address = String(row.address || "").trim();
  const city = String(row.city || "").trim();
  const pincode = String(row.pincode || "").trim();
  if (!name || !phone || !address || !city || !pincode) return null;
  if (!/^\+?\d{10,15}$/.test(phone)) return null;
  if (!/^\d{6}$/.test(pincode)) return null;
  return { name, phone, address, city, pincode };
}

export function parseCartItems(input: unknown): CartLineInput[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const items: CartLineInput[] = [];
  for (const row of input) {
    if (!row || typeof row !== "object") return null;
    const productId = String((row as { productId?: unknown }).productId || "");
    const quantity = Number((row as { quantity?: unknown }).quantity);
    if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) return null;
    items.push({ productId, quantity });
  }
  return items;
}

export function computeOrderTotal(lines: { price: number; quantity: number }[]): number {
  return toMoney(lines.reduce((sum, line) => sum + line.price * line.quantity, 0));
}

export { paymentLabel } from "@/lib/order-status";
