export const UPI_PAYEE_ID = process.env.NEXT_PUBLIC_UPI_ID || "9759586000@upi";
export const UPI_PAYEE_NAME = "FamousDukaan";

export function formatUpiAmount(amount: number): string {
  return (Math.round(amount * 100) / 100).toFixed(2);
}

export function buildUpiUri(amount: number, orderNo: string): string {
  const am = formatUpiAmount(amount);
  const pa = encodeURIComponent(UPI_PAYEE_ID);
  const pn = encodeURIComponent(UPI_PAYEE_NAME);
  const tn = encodeURIComponent(`Order ${orderNo}`);
  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`;
}

export const UTR_PATTERN = /^\d{12}$/;

export function isValidUtr(value: string): boolean {
  return UTR_PATTERN.test(value);
}
