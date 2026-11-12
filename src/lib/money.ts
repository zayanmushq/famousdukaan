export const DISPLAY_CURRENCY = "INR";

export function toMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** Single display formatter for storefront, checkout, and admin amounts. */
export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: DISPLAY_CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toMoney(amount));
}

/**
 * Convert a USD-like demo catalog price to INR.
 * Rule: multiply by 95, then round to the nearest integer ending in 9 (ties round up).
 * Use only for seed/demo catalog prices, never for existing order totals.
 */
export function usdDemoToInr(usd: number): number {
  const rounded = Math.round(usd * 95);
  if (rounded % 10 === 9) return rounded;
  const base = rounded - (rounded % 10);
  const lower = base - 1;
  const upper = base + 9;
  if (Math.abs(rounded - lower) < Math.abs(rounded - upper)) return Math.max(lower, 9);
  return upper;
}
