/**
 * Review and rating checks against a running local server.
 * Creates temporary users/orders/reviews with in-process random passwords
 * (never printed), then deletes temp data and restores seed aggregates.
 */
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = process.env.AUTH_TEST_BASE_URL || process.env.UPI_TEST_BASE_URL || "http://127.0.0.1:3000";
const suffix = randomBytes(6).toString("hex");
const users = {
  customer: { email: `test-rev-customer-${suffix}@famousdukaan.test`, name: "Rev Customer" },
  other: { email: `test-rev-other-${suffix}@famousdukaan.test`, name: "Rev Other" },
  vendor: { email: `test-rev-vendor-${suffix}@famousdukaan.test`, name: "Rev Vendor" },
  admin: { email: `test-rev-admin-${suffix}@famousdukaan.test`, name: "Rev Admin" },
};

function makePassword() {
  return `Aa1!${randomBytes(12).toString("base64url")}`;
}
const passwords = {
  customer: makePassword(),
  other: makePassword(),
  vendor: makePassword(),
  admin: makePassword(),
};

type CookieJar = Map<string, string>;
const emails = Object.values(users).map((u) => u.email);
const slug = `temp-rev-${suffix}`;
let tempProductId = "";
let tempVendorId = "";
let snapshot: {
  products: { id: string; rating: number; reviewCount: number }[];
  vendors: { id: string; rating: number }[];
} = { products: [], vendors: [] };

function cookieHeader(jar: CookieJar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}
function storeCookies(jar: CookieJar, res: Response) {
  const raw = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const fallback = res.headers.get("set-cookie");
  const list = raw.length ? raw : fallback ? [fallback] : [];
  for (const item of list) {
    const pair = item.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1));
  }
}
async function request(path: string, init: RequestInit & { jar?: CookieJar; redirect?: RequestRedirect } = {}) {
  // Release this process's Prisma connection so the Next.js server (pool size 1) can query.
  await prisma.$disconnect();
  const jar = init.jar ?? new Map();
  const headers = new Headers(init.headers);
  if (jar.size) headers.set("cookie", cookieHeader(jar));
  const res = await fetch(`${BASE}${path}`, { ...init, headers, redirect: init.redirect ?? "manual" });
  storeCookies(jar, res);
  return res;
}
async function login(email: string, password: string, jar = new Map<string, string>()) {
  const csrfRes = await request("/api/auth/csrf", { jar });
  const csrf = await csrfRes.json() as { csrfToken?: string };
  if (!csrf.csrfToken) throw new Error("Missing CSRF token");
  const body = new URLSearchParams({
    csrfToken: csrf.csrfToken,
    email,
    password,
    json: "true",
    callbackUrl: `${BASE}/account`,
  });
  const res = await request("/api/auth/callback/credentials", {
    method: "POST",
    jar,
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  return { res, jar };
}
function expect(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
}

function extractJsonLd(html: string) {
  const blocks: unknown[] = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch {
      // ignore non-JSON
    }
  }
  return blocks as Array<Record<string, unknown>>;
}

async function restoreAggregates() {
  for (const row of snapshot.products) {
    await prisma.product.update({
      where: { id: row.id },
      data: { rating: row.rating, reviewCount: row.reviewCount },
    }).catch(() => undefined);
  }
  for (const row of snapshot.vendors) {
    await prisma.vendor.update({
      where: { id: row.id },
      data: { rating: row.rating },
    }).catch(() => undefined);
  }
}

async function cleanup() {
  await prisma.review.deleteMany({
    where: {
      OR: [
        { user: { email: { in: emails } } },
        { product: { slug } },
      ],
    },
  });
  await prisma.inventoryMovement.deleteMany({
    where: {
      OR: [
        { createdBy: { email: { in: emails } } },
        { order: { user: { email: { in: emails } } } },
        { product: { slug } },
      ],
    },
  });
  await prisma.orderItem.deleteMany({
    where: { OR: [{ order: { user: { email: { in: emails } } } }, { product: { slug } }] },
  });
  await prisma.orderFulfillment.deleteMany({
    where: { OR: [{ order: { user: { email: { in: emails } } } }, { vendor: { slug } }] },
  });
  await prisma.order.deleteMany({
    where: { OR: [{ user: { email: { in: emails } } }, { verifiedBy: { email: { in: emails } } }] },
  });
  await prisma.product.deleteMany({ where: { slug } });
  await prisma.vendor.deleteMany({ where: { slug } });
  await prisma.loginAttempt.deleteMany({ where: { email: { in: emails } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await restoreAggregates();
}

async function main() {
  try {
    snapshot = {
      products: await prisma.product.findMany({ select: { id: true, rating: true, reviewCount: true } }),
      vendors: await prisma.vendor.findMany({ select: { id: true, rating: true } }),
    };

    const vendorUser = await prisma.user.create({
      data: {
        email: users.vendor.email,
        name: users.vendor.name,
        role: "VENDOR",
        passwordHash: await bcrypt.hash(passwords.vendor, 12),
        vendor: { create: { storeName: `Rev Store ${suffix}`, slug, status: "APPROVED", rating: 0 } },
      },
      include: { vendor: true },
    });
    tempVendorId = vendorUser.vendor!.id;
    const product = await prisma.product.create({
      data: {
        vendorId: tempVendorId,
        name: `Review Test Mug ${suffix}`,
        slug,
        description: "Temporary product for review tests",
        price: 25,
        stock: 10,
        images: ["https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80"],
        category: "Home",
        rating: 0,
        reviewCount: 0,
        status: "ACTIVE",
      },
    });
    tempProductId = product.id;

    const customer = await prisma.user.create({
      data: {
        email: users.customer.email,
        name: users.customer.name,
        role: "CUSTOMER",
        passwordHash: await bcrypt.hash(passwords.customer, 12),
      },
    });
    await prisma.user.create({
      data: {
        email: users.other.email,
        name: users.other.name,
        role: "CUSTOMER",
        passwordHash: await bcrypt.hash(passwords.other, 12),
      },
    });
    await prisma.user.create({
      data: {
        email: users.admin.email,
        name: users.admin.name,
        role: "ADMIN",
        passwordHash: await bcrypt.hash(passwords.admin, 12),
      },
    });

    const order = await prisma.order.create({
      data: {
        orderNo: `RVW-${suffix}`,
        userId: customer.id,
        vendorId: tempVendorId,
        total: 25,
        status: "DELIVERED",
        paymentMethod: "UPI",
        paymentStatus: "PAID",
        paidAt: new Date(),
        shippingAddress: {
          name: "Rev Customer",
          phone: "9876543210",
          address: "14 Review Street",
          city: "Mumbai",
          pincode: "400001",
        },
      },
    });
    const fulfillment = await prisma.orderFulfillment.create({
      data: {
        orderId: order.id,
        vendorId: tempVendorId,
        status: "DELIVERED",
        deliveredAt: new Date(),
      },
    });
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        fulfillmentId: fulfillment.id,
        productId: tempProductId,
        quantity: 1,
        price: 25,
      },
    });

    const unauth = await request("/api/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: tempProductId, rating: 5, comment: "Great" }),
    });
    expect(unauth.status === 401, "unauthenticated POST /api/reviews returns 401");

    const otherLogin = await login(users.other.email, passwords.other);
    const nonBuyer = await request("/api/reviews", {
      method: "POST",
      jar: otherLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: tempProductId, rating: 5, comment: "Great" }),
    });
    expect(nonBuyer.status === 403, "non-buyer POST /api/reviews returns 403");

    const vendorLogin = await login(users.vendor.email, passwords.vendor);
    const vendorPost = await request("/api/reviews", {
      method: "POST",
      jar: vendorLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: tempProductId, rating: 5 }),
    });
    expect(vendorPost.status === 403, "vendor POST /api/reviews returns 403");

    const customerLogin = await login(users.customer.email, passwords.customer);
    const invalid = await request("/api/reviews", {
      method: "POST",
      jar: customerLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: tempProductId, rating: 6, comment: "Too high" }),
    });
    expect(invalid.status === 400, "rating outside 1-5 returns 400");

    const missing = await request("/api/reviews", {
      method: "POST",
      jar: customerLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rating: 5 }),
    });
    expect(missing.status === 400, "missing productId returns 400");

    const comment = "The pour-over process feels solid with this test mug.";
    const created = await request("/api/reviews", {
      method: "POST",
      jar: customerLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: tempProductId, rating: 5, comment }),
    });
    const createdJson = await created.json() as { review?: { id: string; rating: number } };
    expect(created.status === 201 && createdJson.review?.rating === 5, "verified buyer can submit a review");

    const productAfter = await prisma.product.findUniqueOrThrow({ where: { id: tempProductId } });
    const vendorAfter = await prisma.vendor.findUniqueOrThrow({ where: { id: tempVendorId } });
    expect(productAfter.reviewCount === 1 && productAfter.rating === 5, "product aggregates recompute after a visible review");
    expect(vendorAfter.rating === 5, "vendor rating recomputes after a visible review");

    const duplicate = await request("/api/reviews", {
      method: "POST",
      jar: customerLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: tempProductId, rating: 4, comment: "Again" }),
    });
    expect(duplicate.status === 409, "duplicate review returns 409");

    const pdp = await request(`/product/${tempProductId}`);
    const pdpHtml = await pdp.text();
    const jsonLd = extractJsonLd(pdpHtml);
    const productLd = jsonLd.find((block) => block["@type"] === "Product") as
      | { aggregateRating?: { ratingValue: number; reviewCount: number }; review?: { reviewBody?: string }[] }
      | undefined;
    expect(
      pdp.status === 200 &&
        pdpHtml.includes("★") &&
        pdpHtml.includes(`Review Test Mug ${suffix}`) &&
        productLd?.aggregateRating?.reviewCount === 1 &&
        Number(productLd?.aggregateRating?.ratingValue) === 5,
      "PDP shows computed stars for visible reviews",
    );
    expect(
      productLd?.aggregateRating?.reviewCount === 1 &&
        Number(productLd?.aggregateRating?.ratingValue) === 5 &&
        Boolean(productLd?.review?.some((entry) => entry.reviewBody === comment)),
      "JSON-LD aggregateRating matches the visible review",
    );

    const unauthAdmin = await request("/api/admin/reviews");
    expect(unauthAdmin.status === 401, "GET /api/admin/reviews requires auth");
    const customerAdmin = await request("/api/admin/reviews", { jar: customerLogin.jar });
    expect(customerAdmin.status === 403, "GET /api/admin/reviews requires ADMIN");
    const unauthAdminPage = await request("/admin");
    expect(
      unauthAdminPage.status === 307 && (unauthAdminPage.headers.get("location") || "").includes("/login"),
      "admin Reviews tab page requires ADMIN (login redirect)",
    );

    const adminLogin = await login(users.admin.email, passwords.admin);
    const adminList = await request("/api/admin/reviews", { jar: adminLogin.jar });
    const adminJson = await adminList.json() as { reviews?: { id: string }[] };
    expect(adminList.status === 200 && Boolean(adminJson.reviews?.some((row) => row.id === createdJson.review!.id)), "admin can list reviews");

    const hide = await request(`/api/admin/reviews/${createdJson.review!.id}`, {
      method: "PATCH",
      jar: adminLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "HIDDEN" }),
    });
    expect(hide.status === 200, "admin can hide a review");
    const hiddenProduct = await prisma.product.findUniqueOrThrow({ where: { id: tempProductId } });
    const hiddenVendor = await prisma.vendor.findUniqueOrThrow({ where: { id: tempVendorId } });
    expect(hiddenProduct.reviewCount === 0 && hiddenProduct.rating === 0, "hiding a review recomputes product aggregates to 0");
    expect(hiddenVendor.rating === 0, "hiding a review recomputes vendor rating to 0");

    const hiddenPdp = await request(`/product/${tempProductId}`);
    const hiddenHtml = await hiddenPdp.text();
    const hiddenLd = extractJsonLd(hiddenHtml).find((block) => block["@type"] === "Product") as { aggregateRating?: unknown } | undefined;
    expect(!hiddenHtml.includes("★") && !hiddenLd?.aggregateRating, "hidden review removes stars and aggregateRating from the PDP");

    const unhide = await request(`/api/admin/reviews/${createdJson.review!.id}`, {
      method: "PATCH",
      jar: adminLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "VISIBLE" }),
    });
    expect(unhide.status === 200, "admin can unhide a review");
    const unhiddenProduct = await prisma.product.findUniqueOrThrow({ where: { id: tempProductId } });
    expect(unhiddenProduct.reviewCount === 1 && unhiddenProduct.rating === 5, "unhiding restores visible aggregates");

    const del = await request(`/api/admin/reviews/${createdJson.review!.id}`, {
      method: "DELETE",
      jar: adminLogin.jar,
    });
    expect(del.status === 200, "admin can delete a review");
    const deleted = await prisma.review.findUnique({ where: { id: createdJson.review!.id } });
    const afterDelete = await prisma.product.findUniqueOrThrow({ where: { id: tempProductId } });
    expect(deleted === null && afterDelete.reviewCount === 0 && afterDelete.rating === 0, "delete removes the row and recomputes to 0");

    for (const id of ["1", "2", "3", "4", "5", "6"]) {
      const res = await request(`/product/${id}`);
      const html = await res.text();
      const ld = extractJsonLd(html).find((block) => block["@type"] === "Product") as { aggregateRating?: unknown } | undefined;
      const hasReviewStars = /★\s*[\d.]+\s*·\s*\d+\s*reviews?/.test(html);
      expect(res.status === 200 && !hasReviewStars && !ld?.aggregateRating, `catalog product ${id} has no review stars and no aggregateRating`);
    }

    const catalog = await request("/api/products");
    const catalogJson = await catalog.json() as { products?: { id: string; rating: number; reviews: number }[] };
    const seeded = (catalogJson.products || []).filter((row) => ["1", "2", "3", "4", "5", "6"].includes(row.id));
    expect(
      catalog.status === 200 && seeded.length === 6 && seeded.every((row) => row.rating === 0 && row.reviews === 0),
      "/api/products ratings are 0 for catalog products 1-6",
    );

    const loginPage = await request("/login");
    const checkoutPage = await request("/checkout");
    expect(loginPage.status === 200, "/login still returns 200");
    expect(checkoutPage.status === 200 || checkoutPage.status === 307, "/checkout still returns 200 or the existing login redirect");
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await cleanup().catch(() => undefined);
  await prisma.$disconnect();
  process.exit(1);
});
