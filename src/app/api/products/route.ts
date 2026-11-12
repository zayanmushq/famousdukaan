import { NextResponse } from "next/server";
import { getProducts } from "@/lib/catalog";
import { requireApiRole } from "@/lib/auth-guard";

export async function GET() {
  const { source, products } = await getProducts();
  return NextResponse.json(
    { source, products },
    { headers: { "X-Data-Source": source } }
  );
}

export async function POST(request: Request) {
  const { error } = await requireApiRole(["VENDOR", "ADMIN"]);
  if (error) return error;
  const body = await request.json();
  // In real app: save to database
  return NextResponse.json({ success: true, product: body });
}
