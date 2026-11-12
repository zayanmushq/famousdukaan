import { PrismaClient } from "@prisma/client";
import { products, vendors, reviews } from "../src/lib/data";

const prisma = new PrismaClient();

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const vendorOwners: Record<string, { userId: string; email: string; name: string }> = {
  v1: { userId: "u-v1", email: "atelier@famousdukaan.demo", name: "Atelier Noir" },
  v2: { userId: "u-v2", email: "formstudio@famousdukaan.demo", name: "Form Studio" },
  v3: { userId: "u-v3", email: "lumen@famousdukaan.demo", name: "Lumen" },
  v4: { userId: "u-v4", email: "chronos@famousdukaan.demo", name: "Chronos" },
};

const reviewAuthors: Record<string, { id: string; email: string; name: string }> = {
  "Elena M.": { id: "u-elena", email: "elena@famousdukaan.demo", name: "Elena M." },
  "James K.": { id: "u-james", email: "james@famousdukaan.demo", name: "James K." },
  "Sofia L.": { id: "u-sofia", email: "sofia@famousdukaan.demo", name: "Sofia L." },
};

async function main() {
  const customerIds = Object.values(reviewAuthors);
  for (const user of customerIds) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: { email: user.email, name: user.name, role: "CUSTOMER" },
      create: { id: user.id, email: user.email, name: user.name, role: "CUSTOMER" },
    });
  }

  for (const vendor of vendors) {
    const owner = vendorOwners[vendor.id];
    if (!owner) throw new Error(`Missing owner for vendor ${vendor.id}`);

    await prisma.user.upsert({
      where: { id: owner.userId },
      update: { email: owner.email, name: owner.name, role: "VENDOR" },
      create: { id: owner.userId, email: owner.email, name: owner.name, role: "VENDOR" },
    });

    await prisma.vendor.upsert({
      where: { id: vendor.id },
      update: {
        storeName: vendor.name,
        slug: slugify(vendor.name),
        description: vendor.description,
        rating: 0,
        status: "APPROVED",
        plan: "FREE",
      },
      create: {
        id: vendor.id,
        userId: owner.userId,
        storeName: vendor.name,
        slug: slugify(vendor.name),
        description: vendor.description,
        rating: 0,
        status: "APPROVED",
        plan: "FREE",
      },
    });
  }

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {
        vendorId: product.vendorId,
        name: product.name,
        slug: slugify(product.name),
        description: `A carefully considered piece from ${product.vendor}.`,
        price: product.price,
        stock: 20,
        images: [product.image],
        category: product.category,
        rating: 0,
        reviewCount: 0,
        fastDelivery: product.fastDelivery,
        assured: true,
        status: "ACTIVE",
      },
      create: {
        id: product.id,
        vendorId: product.vendorId,
        name: product.name,
        slug: slugify(product.name),
        description: `A carefully considered piece from ${product.vendor}.`,
        price: product.price,
        stock: 20,
        images: [product.image],
        category: product.category,
        rating: 0,
        reviewCount: 0,
        fastDelivery: product.fastDelivery,
        assured: true,
        status: "ACTIVE",
      },
    });
  }

  const reviewRows: { id: string; userId: string; productId: string; rating: number; comment: string }[] = [];
  for (const [productId, list] of Object.entries(reviews)) {
    for (const review of list) {
      const author = reviewAuthors[review.name];
      if (!author) throw new Error(`Missing review author ${review.name}`);
      reviewRows.push({
        id: `r-${productId}-${author.id}`,
        userId: author.id,
        productId,
        rating: review.rating,
        comment: review.comment,
      });
    }
  }

  for (const review of reviewRows) {
    await prisma.review.upsert({
      where: { id: review.id },
      update: { rating: review.rating, comment: review.comment, status: "HIDDEN" },
      create: { ...review, status: "HIDDEN" },
    });
  }

  // Keep demo seed reviews hidden and aggregates at 0 so they never reappear as live ratings.
  for (const product of products) {
    const visible = await prisma.review.aggregate({
      where: { productId: product.id, status: "VISIBLE" },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const reviewCount = visible._count._all;
    await prisma.product.update({
      where: { id: product.id },
      data: { reviewCount, rating: reviewCount > 0 ? Number(visible._avg.rating) : 0 },
    });
  }
  for (const vendor of vendors) {
    const visible = await prisma.review.aggregate({
      where: { status: "VISIBLE", product: { vendorId: vendor.id } },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const reviewCount = visible._count._all;
    await prisma.vendor.update({
      where: { id: vendor.id },
      data: { rating: reviewCount > 0 ? Number(visible._avg.rating) : 0 },
    });
  }

  const counts = {
    users: await prisma.user.count(),
    vendors: await prisma.vendor.count(),
    products: await prisma.product.count(),
    reviews: await prisma.review.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
