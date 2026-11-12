/**
 * Temporary inventory and fulfilment checks against a running local server.
 * Creates test users with in-process random passwords (never printed),
 * then deletes temp data and restores any seed stock that was touched.
 */
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";
import { expireUnpaidOrders, UNPAID_EXPIRY_MS } from "../src/lib/inventory";

const prisma = new PrismaClient();
const BASE = process.env.AUTH_TEST_BASE_URL || process.env.UPI_TEST_BASE_URL || "http://127.0.0.1:3000";
const suffix = randomBytes(6).toString("hex");
const users = {
  customer: { email: `test-inv-customer-${suffix}@famousdukaan.test`, name: "Inv Customer" },
  other: { email: `test-inv-other-${suffix}@famousdukaan.test`, name: "Inv Other" },
  vendor: { email: `test-inv-vendor-${suffix}@famousdukaan.test`, name: "Inv Vendor" },
  vendor2: { email: `test-inv-vendor2-${suffix}@famousdukaan.test`, name: "Inv Vendor Two" },
  admin: { email: `test-inv-admin-${suffix}@famousdukaan.test`, name: "Inv Admin" },
};

function makePassword() {
  return `Aa1!${randomBytes(12).toString("base64url")}`;
}
const passwords = {
  customer: makePassword(),
  other: makePassword(),
  vendor: makePassword(),
  vendor2: makePassword(),
  admin: makePassword(),
};

type CookieJar = Map<string, string>;
const emails = Object.values(users).map((u) => u.email);
const slugs = [`temp-inv-${suffix}`, `temp-inv2-${suffix}`];
let stockSnapshot: { id: string; stock: number; status: "ACTIVE" | "DRAFT" | "OUT_OF_STOCK" | "ARCHIVED" }[] = [];
let tempProductId = "";
let tempVendorId = "";
let tempVendor2Id = "";

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
function randomUtr() {
  const n = randomBytes(8);
  let s = "";
  for (const byte of n) s += (byte % 10).toString();
  return (s + "000000000000").slice(0, 12);
}

const shippingAddress = {
  name: "Inv Customer",
  phone: "9876543210",
  address: "14 Stock Street",
  city: "Mumbai",
  pincode: "400001",
};

async function snapshotStock() {
  stockSnapshot = await prisma.product.findMany({ select: { id: true, stock: true, status: true } });
}
async function restoreStock() {
  for (const row of stockSnapshot) {
    await prisma.product.update({ where: { id: row.id }, data: { stock: row.stock, status: row.status } }).catch(() => undefined);
  }
}

async function cleanup() {
  await prisma.inventoryMovement.deleteMany({
    where: {
      OR: [
        { createdBy: { email: { in: emails } } },
        { order: { user: { email: { in: emails } } } },
        { product: { slug: { in: slugs } } },
      ],
    },
  });
  await prisma.orderItem.deleteMany({
    where: { OR: [{ order: { user: { email: { in: emails } } } }, { product: { slug: { in: slugs } } }] },
  });
  await prisma.orderFulfillment.deleteMany({
    where: { OR: [{ order: { user: { email: { in: emails } } } }, { vendor: { slug: { in: slugs } } }] },
  });
  await prisma.order.deleteMany({
    where: { OR: [{ user: { email: { in: emails } } }, { verifiedBy: { email: { in: emails } } }] },
  });
  await prisma.product.deleteMany({ where: { slug: { in: slugs } } });
  await prisma.vendor.deleteMany({ where: { slug: { in: slugs } } });
  await prisma.loginAttempt.deleteMany({ where: { email: { in: emails } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await restoreStock();
}

async function main() {
  try {
    await snapshotStock();

    const vendorUser = await prisma.user.create({
      data: {
        email: users.vendor.email,
        name: users.vendor.name,
        role: "VENDOR",
        passwordHash: await bcrypt.hash(passwords.vendor, 12),
        vendor: { create: { storeName: `Inv Store ${suffix}`, slug: slugs[0], status: "APPROVED" } },
      },
      include: { vendor: true },
    });
    tempVendorId = vendorUser.vendor!.id;
    const vendor2 = await prisma.user.create({
      data: {
        email: users.vendor2.email,
        name: users.vendor2.name,
        role: "VENDOR",
        passwordHash: await bcrypt.hash(passwords.vendor2, 12),
        vendor: { create: { storeName: `Inv Store 2 ${suffix}`, slug: slugs[1], status: "APPROVED" } },
      },
      include: { vendor: true },
    });
    tempVendor2Id = vendor2.vendor!.id;
    const product = await prisma.product.create({
      data: {
        vendorId: tempVendorId,
        name: `Temp Inventory Widget ${suffix}`,
        slug: slugs[0],
        price: 199,
        stock: 2,
        sku: `INV-${suffix.slice(0, 8)}`,
        lowStockThreshold: 1,
        images: [],
        category: "Test",
        status: "ACTIVE",
      },
    });
    tempProductId = product.id;
    await prisma.user.create({
      data: { email: users.customer.email, name: users.customer.name, role: "CUSTOMER", passwordHash: await bcrypt.hash(passwords.customer, 12) },
    });
    await prisma.user.create({
      data: { email: users.other.email, name: users.other.name, role: "CUSTOMER", passwordHash: await bcrypt.hash(passwords.other, 12) },
    });
    await prisma.user.create({
      data: { email: users.admin.email, name: users.admin.name, role: "ADMIN", passwordHash: await bcrypt.hash(passwords.admin, 12) },
    });

    const catalog = await fetch(`${BASE}/api/products`);
    const catalogJson = await catalog.json() as { source?: string; products?: { id: string; stock?: number }[] };
    expect(catalog.ok && catalogJson.source === "db", "GET /api/products source is db");
    const listed = (catalogJson.products || []).find((p) => p.id === tempProductId);
    expect(Boolean(listed) && listed!.stock === 2, "catalog exposes stock for the temp product");

    const customerLogin = await login(users.customer.email, passwords.customer);
    const oversellEarly = await request("/api/orders", {
      method: "POST",
      jar: customerLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: [{ productId: tempProductId, quantity: 3 }], shippingAddress }),
    });
    expect(oversellEarly.status === 409, "ordering more than available stock is rejected");

    const createA = await request("/api/orders", {
      method: "POST",
      jar: customerLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: [{ productId: tempProductId, quantity: 1, price: 1 }],
        shippingAddress,
        total: 1,
      }),
    });
    const orderA = await createA.json() as { order?: { id: string; orderNo: string; total: number } };
    expect(createA.status === 200 && orderA.order?.total === 199, "order A is created with the database price");
    let stock = await prisma.product.findUniqueOrThrow({ where: { id: tempProductId } });
    expect(stock.stock === 1 && stock.status === "ACTIVE", "reserving quantity 1 decrements stock to 1");

    const oversell = await request("/api/orders", {
      method: "POST",
      jar: customerLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: [{ productId: tempProductId, quantity: 2 }], shippingAddress }),
    });
    expect(oversell.status === 409, "second order cannot oversell remaining stock");

    const vendorLogin = await login(users.vendor.email, passwords.vendor);
    const packBeforePaid = await request(`/api/vendor/fulfillments/${(await prisma.orderFulfillment.findFirstOrThrow({ where: { orderId: orderA.order!.id } })).id}`, {
      method: "POST",
      jar: vendorLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "pack" }),
    });
    expect(packBeforePaid.status === 409, "vendor cannot fulfil before the order is paid");

    const adminLogin = await login(users.admin.email, passwords.admin);
    const reject = await request(`/api/admin/payments/${orderA.order!.id}`, {
      method: "POST",
      jar: adminLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "reject" }),
    });
    expect(reject.status === 200, "admin can reject a UTR/payment");
    stock = await prisma.product.findUniqueOrThrow({ where: { id: tempProductId } });
    expect(stock.stock === 1, "Reject keeps the stock reservation");

    const utr = randomUtr();
    const submit = await request(`/api/orders/${orderA.order!.id}/utr`, {
      method: "POST",
      jar: customerLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ utr }),
    });
    expect(submit.status === 200, "customer can resubmit a UTR after reject");

    const vendor2Login = await login(users.vendor2.email, passwords.vendor2);
    const fulfillmentA = await prisma.orderFulfillment.findFirstOrThrow({ where: { orderId: orderA.order!.id } });
    const otherVendorPack = await request(`/api/vendor/fulfillments/${fulfillmentA.id}`, {
      method: "POST",
      jar: vendor2Login.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "pack" }),
    });
    expect(otherVendorPack.status === 403, "a vendor cannot fulfil another vendor's items");

    const customerVendor = await request("/api/vendor/products", { jar: customerLogin.jar });
    expect(customerVendor.status === 403, "customer is denied vendor APIs");

    const markPaid = await request(`/api/admin/payments/${orderA.order!.id}`, {
      method: "POST",
      jar: adminLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "paid" }),
    });
    const paidJson = await markPaid.json() as { order?: { paymentStatus: string; status: string } };
    expect(markPaid.status === 200 && paidJson.order?.paymentStatus === "PAID" && paidJson.order?.status === "CONFIRMED", "admin mark paid confirms the fulfillment");
    stock = await prisma.product.findUniqueOrThrow({ where: { id: tempProductId } });
    expect(stock.stock === 1, "mark paid does not change reserved stock");

    const pack = await request(`/api/vendor/fulfillments/${fulfillmentA.id}`, {
      method: "POST",
      jar: vendorLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "pack" }),
    });
    expect(pack.status === 200, "vendor can mark packed after payment");
    const shipNoTrack = await request(`/api/vendor/fulfillments/${fulfillmentA.id}`, {
      method: "POST",
      jar: vendorLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "ship" }),
    });
    expect(shipNoTrack.status === 400, "shipping without a tracking number is rejected");
    const ship = await request(`/api/vendor/fulfillments/${fulfillmentA.id}`, {
      method: "POST",
      jar: vendorLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "ship", trackingNumber: "FDTRACK123" }),
    });
    expect(ship.status === 200, "vendor can mark shipped with a tracking number");
    const deliver = await request(`/api/vendor/fulfillments/${fulfillmentA.id}`, {
      method: "POST",
      jar: vendorLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "deliver" }),
    });
    expect(deliver.status === 200, "vendor can mark delivered");

    const ordersPage = await request("/orders", { jar: customerLogin.jar });
    const ordersHtml = await ordersPage.text();
    expect(ordersPage.status === 200 && ordersHtml.includes(orderA.order!.orderNo) && ordersHtml.includes("Delivered"), "customer orders page shows the delivered order");

    const badTrack = await fetch(`${BASE}/api/track?orderNo=${encodeURIComponent(orderA.order!.orderNo)}&phoneLast4=0000`);
    expect(badTrack.status === 404, "track with the wrong phone last 4 is not found");
    const publicTrack = await fetch(`${BASE}/api/track?orderNo=${encodeURIComponent(orderA.order!.orderNo)}&phoneLast4=3210`);
    const publicJson = await publicTrack.json() as { order?: { fulfillments?: { timeline?: { key: string; done: boolean }[]; trackingNumber?: string }[]; user?: unknown; shippingAddress?: unknown } };
    expect(publicTrack.status === 200 && publicJson.order?.fulfillments?.[0]?.trackingNumber === "FDTRACK123", "public track works with order number and last 4 digits");
    expect(
      !JSON.stringify(publicJson).includes(users.customer.email) && publicJson.order?.shippingAddress == null,
      "track payload does not leak email or shipping address",
    );
    const deliveredStep = publicJson.order?.fulfillments?.[0]?.timeline?.find((step) => step.key === "DELIVERED");
    expect(Boolean(deliveredStep?.done), "track timeline shows delivered");

    const ownerTrack = await request(`/api/track?orderNo=${encodeURIComponent(orderA.order!.orderNo)}`, { jar: customerLogin.jar });
    expect(ownerTrack.status === 200, "logged-in owner can track without the phone digits");

    const adjust = await request(`/api/vendor/products/${tempProductId}`, {
      method: "PATCH",
      jar: vendorLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stock: 5, lowStockThreshold: 2 }),
    });
    const adjusted = await adjust.json() as { product?: { stock: number } };
    expect(adjust.status === 200 && adjusted.product?.stock === 5, "vendor can adjust stock");

    const createB = await request("/api/orders", {
      method: "POST",
      jar: customerLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: [{ productId: tempProductId, quantity: 2 }], shippingAddress }),
    });
    const orderB = await createB.json() as { order?: { id: string; orderNo: string } };
    expect(createB.status === 200, "customer can place a second unpaid order");
    stock = await prisma.product.findUniqueOrThrow({ where: { id: tempProductId } });
    expect(stock.stock === 3, "second reservation decrements adjusted stock");

    const cancelB = await request(`/api/orders/${orderB.order!.id}/cancel`, {
      method: "POST",
      jar: customerLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "Changed mind" }),
    });
    expect(cancelB.status === 200, "customer can cancel an unpaid order");
    stock = await prisma.product.findUniqueOrThrow({ where: { id: tempProductId } });
    expect(stock.stock === 5, "cancel releases reserved stock");

    const createC = await request("/api/orders", {
      method: "POST",
      jar: customerLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: [{ productId: tempProductId, quantity: 1 }], shippingAddress }),
    });
    const orderC = await createC.json() as { order?: { id: string } };
    expect(createC.status === 200, "order C is created for expiry test");
    await prisma.order.update({
      where: { id: orderC.order!.id },
      data: { createdAt: new Date(Date.now() - UNPAID_EXPIRY_MS - 60_000) },
    });
    const expired = await expireUnpaidOrders();
    expect(expired.orderIds.includes(orderC.order!.id), "unpaid orders older than 24h are expired");
    const expiredRow = await prisma.order.findUniqueOrThrow({ where: { id: orderC.order!.id } });
    expect(expiredRow.status === "CANCELLED" && expiredRow.paymentStatus === "PENDING", "expired order is cancelled and was still PENDING");
    stock = await prisma.product.findUniqueOrThrow({ where: { id: tempProductId } });
    expect(stock.stock === 5, "expiry releases reserved stock");

    const createD = await request("/api/orders", {
      method: "POST",
      jar: customerLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: [{ productId: tempProductId, quantity: 1 }], shippingAddress }),
    });
    const orderD = await createD.json() as { order?: { id: string } };
    const utrD = randomUtr();
    await request(`/api/orders/${orderD.order!.id}/utr`, {
      method: "POST",
      jar: customerLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ utr: utrD }),
    });
    await prisma.order.update({
      where: { id: orderD.order!.id },
      data: { createdAt: new Date(Date.now() - UNPAID_EXPIRY_MS - 60_000) },
    });
    const afterSubmitted = await expireUnpaidOrders();
    expect(!afterSubmitted.orderIds.includes(orderD.order!.id), "SUBMITTED orders are not expired after 24h");
    stock = await prisma.product.findUniqueOrThrow({ where: { id: tempProductId } });
    expect(stock.stock === 4, "submitted order keeps its reservation");

    const adminCancelPaidAttempt = await request(`/api/admin/orders/${orderA.order!.id}`, {
      method: "POST",
      jar: adminLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    const cancelPaidJson = await adminCancelPaidAttempt.json() as { skippedShipped?: number };
    expect(adminCancelPaidAttempt.status === 200 && cancelPaidJson.skippedShipped === 1, "admin cancel of a delivered fulfillment does not restock shipped items");

    const refund = await request(`/api/admin/orders/${orderA.order!.id}`, {
      method: "POST",
      jar: adminLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "refund" }),
    });
    expect(refund.status === 200, "admin can mark a paid order as refunded");

    const list = await request("/api/admin/orders?status=DELIVERED", { jar: adminLogin.jar });
    const listJson = await list.json() as { orders?: { id: string }[] };
    expect(list.status === 200 && (listJson.orders || []).some((o) => o.id === orderA.order!.id), "admin orders filter includes the delivered order");

    const cronUnauth = await fetch(`${BASE}/api/cron/expire-orders`);
    expect(cronUnauth.status === 401, "cron route rejects requests without the secret");
    if (process.env.CRON_SECRET) {
      const cronAuth = await fetch(`${BASE}/api/cron/expire-orders`, {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      });
      const cronJson = await cronAuth.json() as { ok?: boolean };
      expect(cronAuth.status === 200 && cronJson.ok === true, "cron route succeeds with the configured secret");
    }

    const inventory = await request("/api/vendor/products", { jar: vendorLogin.jar });
    const inventoryJson = await inventory.json() as { products?: { id: string }[] };
    expect(inventory.status === 200 && (inventoryJson.products || []).some((p) => p.id === tempProductId), "vendor inventory lists their product");

    console.log("ALL INVENTORY AND ORDER TESTS PASSED");
  } finally {
    await cleanup();
    const leftoverUsers = await prisma.user.count({ where: { email: { in: emails } } });
    const leftoverProducts = await prisma.product.count({ where: { slug: { in: slugs } } });
    console.log(`cleanup complete; leftover test users=${leftoverUsers} leftover temp products=${leftoverProducts}`);
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error("TEST FAILURE:", error instanceof Error ? error.message : "unknown error");
  try {
    await cleanup();
  } catch {
    // ignore cleanup errors
  } finally {
    await prisma.$disconnect();
  }
  process.exit(1);
});
