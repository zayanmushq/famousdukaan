export function toMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function formatInr(amount: number): string {
  return `₹${toMoney(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
