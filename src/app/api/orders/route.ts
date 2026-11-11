import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  // Demo order creation
  const order = {
    id: "AET-" + Math.floor(10000 + Math.random() * 90000),
    ...body,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };
  return NextResponse.json({ success: true, order });
}