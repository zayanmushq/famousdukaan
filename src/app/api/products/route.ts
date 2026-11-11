import { NextResponse } from "next/server";
import { products } from "@/lib/data";

export async function GET() {
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const body = await request.json();
  // In real app: save to database
  return NextResponse.json({ success: true, product: body });
}