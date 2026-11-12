export function getClientIp(source?: unknown): string {
  const rec = source && typeof source === "object" ? (source as Record<string, unknown>) : undefined;
  const raw = rec && "headers" in rec ? rec.headers : rec;
  const headers = raw && typeof raw === "object" ? (raw as { get?: (name: string) => string | null | undefined }) : undefined;
  const get = (name: string) => (typeof headers?.get === "function" ? headers.get(name) : undefined) ?? undefined;
  const forwarded = get("x-forwarded-for") || get("X-Forwarded-For");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return (get("x-real-ip") || get("X-Real-IP") || "unknown").trim();
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
