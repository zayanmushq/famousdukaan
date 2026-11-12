/**
 * Temporary UPI checkout checks against a running local server.
 * Creates test users with in-process random passwords (never printed),
 * then deletes those users, their orders/items, and login attempts.
 */
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";
import { buildUpiUri, UPI_PAYEE_ID, UPI_PAYEE_NAME } from "../src/lib/upi";
import { computeOrderTotal } from "../src/lib/order";

const prisma = new PrismaClient();
const BASE = process.env.AUTH_TEST_BASE_URL || process.env.UPI_TEST_BASE_URL || "http://127.0.0.1:3000";
const suffix = randomBytes(6).toString("hex");
const users = {
  customer: { email: `test-upi-customer-${suffix}@famousdukaan.test`, name: "UPI Test Customer" },
  other: { email: `test-upi-other-${suffix}@famousdukaan.test`, name: "UPI Other Customer" },
  admin: { email: `test-upi-admin-${suffix}@famousdukaan.test`, name: "UPI Test Admin" },
};

function makePassword() {
  return `Aa1!${randomBytes(12).toString("base64url")}`;
}

const passwords = {
  customer: makePassword(),
  other: makePassword(),
  admin: makePassword(),
};

type CookieJar = Map<string, string>;

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

const emails = Object.values(users).map((u) => u.email);

async function cleanup() {
  await prisma.orderItem.deleteMany({ where: { order: { user: { email: { in: emails } } } } });
  await prisma.order.deleteMany({ where: { OR: [{ user: { email: { in: emails } } }, { verifiedBy: { email: { in: emails } } }] } });
  await prisma.loginAttempt.deleteMany({ where: { email: { in: emails } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
}

async function main() {
  try {
    await prisma.user.create({
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

    const unauthOrder = await fetch(`${BASE}/api/orders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(unauthOrder.status === 401, "POST /api/orders returns 401 logged out");

    const checkoutLoggedOut = await fetch(`${BASE}/checkout`, { redirect: "manual" });
    const checkoutLoc = checkoutLoggedOut.headers.get("location") || "";
    expect(checkoutLoggedOut.status >= 300 && checkoutLoggedOut.status < 400 && checkoutLoc.includes("/login"), "/checkout redirects to login when logged out");

    const products = await prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, price: true, name: true },
      orderBy: { createdAt: "asc" },
      take: 2,
    });
    expect(products.length === 2, "two active catalog products are available for the order");

    const cart = [
      { productId: products[0].id, quantity: 2 },
      { productId: products[1].id, quantity: 1 },
    ];
    const expectedTotal = computeOrderTotal(cart.map((item, i) => ({ price: products[i].price, quantity: item.quantity })));
    const shippingAddress = {
      name: "Test Customer",
      phone: "9876543210",
      address: "12 Test Street",
      city: "Mumbai",
      pincode: "400001",
    };

    const customerLogin = await login(users.customer.email, passwords.customer);
    expect(customerLogin.res.status < 400 || customerLogin.res.status === 302, "customer can log in");

    const createRes = await request("/api/orders", {
      method: "POST",
      jar: customerLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: cart,
        shippingAddress,
        // Deliberately untrustworthy client totals — server must ignore these.
        total: 1,
        prices: cart.map((item) => ({ productId: item.productId, price: 1 })),
      }),
    });
    const created = await createRes.json() as { error?: string; order?: { id: string; orderNo: string; total: number; paymentStatus: string; status: string; items: { price: number; quantity: number; productId: string }[] } };
    expect(createRes.status === 200 && Boolean(created.order?.id), "checkout creates a persisted order");
    expect(created.order!.total === expectedTotal, "order total is computed from database product prices");
    expect(created.order!.paymentStatus === "PENDING" && created.order!.status === "PENDING_PAYMENT", "new order is PENDING_PAYMENT");
    expect(
      created.order!.items.every((item) => {
        const product = products.find((p) => p.id === item.productId);
        return product && item.price === product.price;
      }),
      "order item prices are database prices, not client prices",
    );

    const orderId = created.order!.id;
    const orderNo = created.order!.orderNo;
    const expectedUri = buildUpiUri(expectedTotal, orderNo);

    const detailRes = await request(`/api/orders/${orderId}`, { jar: customerLogin.jar });
    const detail = await detailRes.json() as { order?: { total: number; orderNo: string }; upi?: { uri: string; payeeId: string; payeeName: string } };
    expect(detailRes.status === 200, "owner can load the order payment details");
    expect(detail.upi?.payeeId === UPI_PAYEE_ID && detail.upi?.payeeName === UPI_PAYEE_NAME, "UPI payee is FamousDukaan configured ID");
    expect(detail.upi?.uri === expectedUri, "deep link matches upi://pay with amount, currency, and order number");
    expect(
      expectedUri.includes("pa=9759586000%40upi") || expectedUri.includes("pa=9759586000@upi"),
      "deep link contains the payee VPA",
    );
    expect(expectedUri.includes("cu=INR") && expectedUri.includes(`am=${expectedTotal.toFixed(2)}`), "deep link amount is 2 decimal places in INR");

    const payPage = await request(`/checkout/pay/${orderId}`, { jar: customerLogin.jar, redirect: "manual" });
    expect(payPage.status === 200, "owner can open the payment page");
    const payHtml = await payPage.text();
    expect(payHtml.includes("verified manually") && payHtml.includes("confirms") || payHtml.includes("confirmed only after"), "pay page notes that payment is verified manually");
    const htmlUri = expectedUri.replaceAll("&", "&amp;");
    const hasDeepLink = payHtml.includes(expectedUri) || payHtml.includes(htmlUri);
    expect(payHtml.includes(orderNo) && hasDeepLink, "pay page shows the order number and UPI deep link");
    expect(payHtml.includes("Pay with UPI app"), "pay page has a Pay with UPI app button");

    const otherLogin = await login(users.other.email, passwords.other);
    const otherApi = await request(`/api/orders/${orderId}`, { jar: otherLogin.jar });
    expect(otherApi.status === 403, "non-owner is denied order payment details");
    const otherUtr = await request(`/api/orders/${orderId}/utr`, {
      method: "POST",
      jar: otherLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ utr: randomUtr() }),
    });
    expect(otherUtr.status === 403, "non-owner cannot submit a UTR");
    const otherPage = await request(`/checkout/pay/${orderId}`, { jar: otherLogin.jar, redirect: "manual" });
    const otherLoc = otherPage.headers.get("location") || "";
    const otherHtml = await otherPage.text();
    const otherDeniedHttp = otherPage.status === 403 || otherLoc.includes("/403");
    const otherDeniedRsc =
      otherPage.status === 200 &&
      otherHtml.includes("NEXT_REDIRECT") &&
      otherHtml.includes("403") &&
      !otherHtml.includes("upi://") &&
      !otherHtml.includes("Pay with UPI app");
    expect(otherDeniedHttp || otherDeniedRsc, "non-owner is denied the payment page");

    const badUtr = await request(`/api/orders/${orderId}/utr`, {
      method: "POST",
      jar: customerLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ utr: "12345" }),
    });
    expect(badUtr.status === 400, "invalid UTR format is rejected");

    const utr = randomUtr();
    const submit = await request(`/api/orders/${orderId}/utr`, {
      method: "POST",
      jar: customerLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ utr }),
    });
    const submitted = await submit.json() as { order?: { paymentStatus: string; upiTxnRef: string } };
    expect(submit.status === 200 && submitted.order?.paymentStatus === "SUBMITTED" && submitted.order?.upiTxnRef === utr, "owner can submit a 12-digit UTR");

    const second = await request("/api/orders", {
      method: "POST",
      jar: customerLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: [{ productId: products[0].id, quantity: 1 }],
        shippingAddress,
      }),
    });
    const secondOrder = await second.json() as { order?: { id: string } };
    expect(second.status === 200 && Boolean(secondOrder.order?.id), "customer can place a second order");
    const dup = await request(`/api/orders/${secondOrder.order!.id}/utr`, {
      method: "POST",
      jar: customerLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ utr }),
    });
    expect(dup.status === 409, "duplicate UTR is rejected");

    const customerMarkPaid = await request(`/api/admin/payments/${orderId}`, {
      method: "POST",
      jar: customerLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "paid" }),
    });
    expect(customerMarkPaid.status === 403, "customer cannot mark an order paid");

    const adminLogin = await login(users.admin.email, passwords.admin);
    const adminList = await request("/api/admin/payments", { jar: adminLogin.jar });
    const listJson = await adminList.json() as { orders?: { id: string; upiTxnRef: string | null; total: number }[] };
    expect(adminList.status === 200 && (listJson.orders || []).some((o) => o.id === orderId && o.upiTxnRef === utr && o.total === expectedTotal), "admin payments list includes the submitted order with UTR and amount");

    const markPaid = await request(`/api/admin/payments/${orderId}`, {
      method: "POST",
      jar: adminLogin.jar,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "paid" }),
    });
    const paid = await markPaid.json() as { order?: { paymentStatus: string; status: string; paidAt: string | null; verifiedById: string | null } };
    expect(markPaid.status === 200 && paid.order?.paymentStatus === "PAID" && paid.order?.status === "CONFIRMED" && Boolean(paid.order?.paidAt) && Boolean(paid.order?.verifiedById), "admin can mark the order paid");

    const afterPay = await request(`/api/orders/${orderId}`, { jar: customerLogin.jar });
    const afterPayJson = await afterPay.json() as { order?: { paymentStatus: string; status: string } };
    expect(afterPayJson.order?.paymentStatus === "PAID" && afterPayJson.order?.status === "CONFIRMED", "customer sees the order as PAID");

    const ordersPage = await request("/orders", { jar: customerLogin.jar, redirect: "manual" });
    expect(ordersPage.status === 200, "customer can open /orders");
    const ordersHtml = await ordersPage.text();
    expect(ordersHtml.includes(orderNo) && (ordersHtml.includes("Paid") || ordersHtml.includes("PAID")), "customer orders page shows the paid order");

    console.log("ALL UPI CHECKOUT TESTS PASSED");
  } finally {
    await cleanup();
    const leftover = await prisma.user.count({ where: { email: { in: emails } } });
    const leftoverOrders = await prisma.order.count({ where: { user: { email: { in: emails } } } });
    console.log(`cleanup complete; leftover test users=${leftover} leftover orders=${leftoverOrders}`);
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
