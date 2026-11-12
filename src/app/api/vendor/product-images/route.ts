import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth-guard";
import {
  isProductImageUploadEnabled,
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_TYPES,
  uploadProductImage,
} from "@/lib/product-images";

export async function GET() {
  const { error } = await requireApiRole(["VENDOR", "ADMIN"]);
  if (error) return error;
  return NextResponse.json({
    enabled: isProductImageUploadEnabled(),
    maxBytes: PRODUCT_IMAGE_MAX_BYTES,
    types: PRODUCT_IMAGE_TYPES,
  });
}

export async function POST(request: Request) {
  const { session, error } = await requireApiRole(["VENDOR", "ADMIN"]);
  if (error || !session) return error;
  if (session.user.role === "VENDOR" && session.user.vendorStatus !== "APPROVED") {
    return NextResponse.json({ error: "Store must be approved before images can be uploaded" }, { status: 403 });
  }
  const vendorId = session.user.vendorId;
  if (!vendorId) {
    return NextResponse.json({ error: "Vendor profile not found" }, { status: 403 });
  }
  if (!isProductImageUploadEnabled()) {
    return NextResponse.json({
      error: "Image upload is not enabled. Paste an image URL instead.",
      enabled: false,
    }, { status: 501 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await uploadProductImage({
    vendorId,
    filename: file.name || "image",
    contentType: file.type,
    body: buffer,
  });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ success: true, url: result.url, path: result.path });
}
