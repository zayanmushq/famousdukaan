export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const PINCODE_RE = /^[1-9][0-9]{5}$/;
export const PHONE_RE = /^[6-9][0-9]{9}$/;
export const ACCOUNT_RE = /^[0-9]{9,18}$/;
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugifyStoreName(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "store";
}

export function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  return digits;
}

export function normalizeAccountNumber(value: string) {
  return value.replace(/\s+/g, "").trim();
}

export type VendorApplyInput = {
  storeName: string;
  slug: string;
  description: string;
  contactPhone: string;
  pickupCity: string;
  pickupState: string;
  pickupPincode: string;
  pan: string;
  gstin: string | null;
  bankAccountHolder: string;
  bankIfsc: string;
  bankAccountNumber: string;
};

export function parseVendorApply(body: Record<string, unknown>): { data?: VendorApplyInput; error?: string } {
  const storeName = String(body.storeName || "").trim();
  const slugRaw = String(body.slug || slugifyStoreName(storeName)).trim().toLowerCase();
  const description = String(body.description || "").trim();
  const contactPhone = normalizePhone(String(body.contactPhone || ""));
  const pickupCity = String(body.pickupCity || "").trim();
  const pickupState = String(body.pickupState || "").trim();
  const pickupPincode = String(body.pickupPincode || "").replace(/\s+/g, "");
  const pan = String(body.pan || "").replace(/\s+/g, "").toUpperCase();
  const gstinRaw = String(body.gstin || "").replace(/\s+/g, "").toUpperCase();
  const bankAccountHolder = String(body.bankAccountHolder || "").trim();
  const bankIfsc = String(body.bankIfsc || "").replace(/\s+/g, "").toUpperCase();
  const bankAccountNumber = normalizeAccountNumber(String(body.bankAccountNumber || ""));

  if (storeName.length < 2) return { error: "Shop name is required" };
  if (storeName.length > 80) return { error: "Shop name is too long" };
  if (!SLUG_RE.test(slugRaw)) return { error: "Slug may only contain lowercase letters, numbers, and hyphens" };
  if (description.length < 10) return { error: "Description must be at least 10 characters" };
  if (description.length > 2000) return { error: "Description is too long" };
  if (!PHONE_RE.test(contactPhone)) return { error: "Enter a valid 10-digit Indian mobile number" };
  if (pickupCity.length < 2) return { error: "Pickup city is required" };
  if (pickupState.length < 2) return { error: "Pickup state is required" };
  if (!PINCODE_RE.test(pickupPincode)) return { error: "Enter a valid 6-digit pincode" };
  if (!PAN_RE.test(pan)) return { error: "Enter a valid PAN (for example ABCDE1234F)" };
  if (gstinRaw && !GSTIN_RE.test(gstinRaw)) return { error: "Enter a valid GSTIN or leave it blank" };
  if (bankAccountHolder.length < 2) return { error: "Bank account holder name is required" };
  if (!IFSC_RE.test(bankIfsc)) return { error: "Enter a valid IFSC code" };
  if (!ACCOUNT_RE.test(bankAccountNumber)) return { error: "Enter a valid bank account number (9-18 digits)" };

  return {
    data: {
      storeName,
      slug: slugRaw,
      description,
      contactPhone,
      pickupCity,
      pickupState,
      pickupPincode,
      pan,
      gstin: gstinRaw || null,
      bankAccountHolder,
      bankIfsc,
      bankAccountNumber,
    },
  };
}

export const PUBLIC_PRODUCT_STATUSES = ["ACTIVE", "OUT_OF_STOCK"] as const;

export function isPublicProductStatus(status: string) {
  return status === "ACTIVE" || status === "OUT_OF_STOCK";
}
