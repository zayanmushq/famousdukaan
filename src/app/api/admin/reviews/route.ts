import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  const reviews = await prisma.review.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      product: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    reviews: reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      status: review.status,
      createdAt: review.createdAt.toISOString(),
      productId: review.product.id,
      productName: review.product.name,
      customerName: review.user.name,
      customerEmail: review.user.email,
    })),
  });
}
