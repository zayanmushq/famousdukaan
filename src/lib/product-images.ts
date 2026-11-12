import { createClient } from "@supabase/supabase-js";

export const PRODUCT_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const PRODUCT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PRODUCT_IMAGE_BUCKET = "product-images";

export function isProductImageUploadEnabled() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL);
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function uploadProductImage(input: {
  vendorId: string;
  filename: string;
  contentType: string;
  body: Buffer;
}) {
  if (input.body.length > PRODUCT_IMAGE_MAX_BYTES) {
    return { error: "Image must be 2MB or smaller", status: 400 as const };
  }
  if (!PRODUCT_IMAGE_TYPES.includes(input.contentType as (typeof PRODUCT_IMAGE_TYPES)[number])) {
    return { error: "Only JPEG, PNG, and WebP images are allowed", status: 400 as const };
  }
  const client = serviceClient();
  if (!client) {
    return { error: "Image upload is not enabled", status: 501 as const };
  }
  const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "image";
  const path = `${input.vendorId}/${Date.now()}-${safeName}`;
  const { error } = await client.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, input.body, {
    contentType: input.contentType,
    upsert: false,
  });
  if (error) {
    return { error: "Could not upload image", status: 500 as const };
  }
  const { data } = client.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}
