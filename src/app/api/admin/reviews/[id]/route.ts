import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { recomputeProductAndVendorRatings } from "@/lib/reviews";
import { revalidateReviewPaths } from "@/lib/review-paths";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const status = (body as { status?: unknown })?.status;
  if (status !== "VISIBLE" && status !== "HIDDEN") {
    return NextResponse.json({ error: "status must be VISIBLE or HIDDEN" }, { status: 400 });
  }

  const existing = await prisma.review.findUnique({ where: { id }, select: { productId: true } });
  if (!existing) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  const review = await prisma.$transaction(async (tx) => {
    const updated = await tx.review.update({
      where: { id },
      data: { status },
      select: { id: true, status: true, productId: true },
    });
    await recomputeProductAndVendorRatings(tx, existing.productId);
    return updated;
  });
  await revalidateReviewPaths(existing.productId);
  return NextResponse.json({ success: true, review });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  const { id } = await context.params;
  const existing = await prisma.review.findUnique({ where: { id }, select: { productId: true } });
  if (!existing) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id } });
    await recomputeProductAndVendorRatings(tx, existing.productId);
  });
  await revalidateReviewPaths(existing.productId);
  return NextResponse.json({ success: true });
}
