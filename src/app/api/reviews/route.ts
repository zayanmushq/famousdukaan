import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireApiRole, requireApiSession } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { revalidateReviewPaths } from "@/lib/review-paths";
import {
  findVerifiedPurchaseOrderId,
  isReviewRateLimited,
  parseReviewComment,
  parseReviewRating,
  recomputeProductAndVendorRatings,
} from "@/lib/reviews";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId")?.trim();
  if (!productId) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }

  const { session } = await requireApiSession();
  if (!session?.user || session.user.role !== "CUSTOMER") {
    return NextResponse.json({ canReview: false, hasReviewed: false });
  }

  const existing = await prisma.review.findUnique({
    where: { userId_productId: { userId: session.user.id, productId } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ canReview: false, hasReviewed: true });
  }
  const orderId = await findVerifiedPurchaseOrderId(session.user.id, productId);
  return NextResponse.json({ canReview: Boolean(orderId), hasReviewed: false });
}

export async function POST(request: Request) {
  const { session, error } = await requireApiRole(["CUSTOMER"]);
  if (error || !session) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const productId = String((body as { productId?: unknown })?.productId || "").trim();
  if (!productId) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }
  const rating = parseReviewRating((body as { rating?: unknown }).rating);
  if (rating == null) {
    return NextResponse.json({ error: "Rating must be an integer from 1 to 5" }, { status: 400 });
  }
  const parsedComment = parseReviewComment((body as { comment?: unknown }).comment);
  if (!parsedComment.ok) {
    return NextResponse.json({ error: parsedComment.error }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, status: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const orderId = await findVerifiedPurchaseOrderId(session.user.id, productId);
  if (!orderId) {
    return NextResponse.json(
      { error: "You can only review products from a paid, delivered order" },
      { status: 403 },
    );
  }

  if (await isReviewRateLimited(session.user.id)) {
    return NextResponse.json({ error: "Too many reviews. Please try again later." }, { status: 429 });
  }

  try {
    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          userId: session.user.id,
          productId,
          orderId,
          rating,
          comment: parsedComment.comment,
          status: "VISIBLE",
        },
        select: {
          id: true,
          productId: true,
          rating: true,
          comment: true,
          status: true,
          createdAt: true,
        },
      });
      await recomputeProductAndVendorRatings(tx, productId);
      return created;
    });
    await revalidateReviewPaths(productId);
    return NextResponse.json({ success: true, review }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "You have already reviewed this product" }, { status: 409 });
    }
    throw err;
  }
}
