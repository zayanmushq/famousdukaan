import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const REVIEW_MAX_COMMENT = 2000;
export const REVIEW_RATE_LIMIT = 5;
export const REVIEW_RATE_WINDOW_MS = 15 * 60 * 1000;

type Db = PrismaClient | Prisma.TransactionClient;

export function parseReviewRating(value: unknown): number | null {
  const rating = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  return rating;
}

export function parseReviewComment(value: unknown): { ok: true; comment: string | null } | { ok: false; error: string } {
  if (value == null) return { ok: true, comment: null };
  if (typeof value !== "string") return { ok: false, error: "Comment must be text" };
  const comment = value.trim();
  if (!comment) return { ok: true, comment: null };
  if (comment.length > REVIEW_MAX_COMMENT) {
    return { ok: false, error: `Comment must be at most ${REVIEW_MAX_COMMENT} characters` };
  }
  return { ok: true, comment };
}

export async function recomputeProductAndVendorRatings(db: Db, productId: string) {
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { vendorId: true },
  });
  if (!product) return;

  const productStats = await db.review.aggregate({
    where: { productId, status: "VISIBLE" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const reviewCount = productStats._count._all;
  await db.product.update({
    where: { id: productId },
    data: {
      reviewCount,
      rating: reviewCount > 0 ? Number(productStats._avg.rating) : 0,
    },
  });

  const vendorStats = await db.review.aggregate({
    where: { status: "VISIBLE", product: { vendorId: product.vendorId } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const vendorCount = vendorStats._count._all;
  await db.vendor.update({
    where: { id: product.vendorId },
    data: { rating: vendorCount > 0 ? Number(vendorStats._avg.rating) : 0 },
  });
}

export async function findVerifiedPurchaseOrderId(userId: string, productId: string) {
  const item = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: {
        userId,
        paymentStatus: "PAID",
        cancelledAt: null,
        refundMarkedAt: null,
        status: { notIn: ["CANCELLED", "RETURNED"] },
      },
      OR: [
        { fulfillment: { status: "DELIVERED" } },
        { order: { status: "DELIVERED" } },
      ],
    },
    select: { orderId: true },
    orderBy: { order: { paidAt: "desc" } },
  });
  return item?.orderId ?? null;
}

export async function isReviewRateLimited(userId: string) {
  const since = new Date(Date.now() - REVIEW_RATE_WINDOW_MS);
  const recent = await prisma.review.count({
    where: { userId, createdAt: { gte: since } },
  });
  return recent >= REVIEW_RATE_LIMIT;
}

export async function getReviewEligibility(userId: string, productId: string) {
  const existing = await prisma.review.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { id: true, status: true },
  });
  if (existing) {
    return { canReview: false, hasReviewed: true, reviewId: existing.id, status: existing.status };
  }
  const orderId = await findVerifiedPurchaseOrderId(userId, productId);
  return { canReview: Boolean(orderId), hasReviewed: false, orderId };
}
