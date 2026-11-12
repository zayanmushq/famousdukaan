import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth-guard";

export async function POST(request: Request) {
  const { session, error } = await requireApiSession();
  if (error || !session) return error;
  const body = await request.json();
  const order = {
    id: "AET-" + Math.floor(10000 + Math.random() * 90000),
    ...body,
    userId: session.user.id,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };
  return NextResponse.json({ success: true, order });
}
