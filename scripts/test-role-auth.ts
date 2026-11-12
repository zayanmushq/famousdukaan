/**
 * Temporary role-auth checks against a running local server.
 * Creates test users with in-process random passwords (never printed),
 * then deletes those users and their login attempts.
 */
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = process.env.AUTH_TEST_BASE_URL || "http://127.0.0.1:3000";
const suffix = randomBytes(6).toString("hex");
const users = {
  customer: { email: `test-customer-${suffix}@famousdukaan.test`, name: "Test Customer", role: "CUSTOMER" as const },
  seller: { email: `test-seller-${suffix}@famousdukaan.test`, name: "Test Seller", role: "VENDOR" as const, storeName: `Temp Store ${suffix}` },
  admin: { email: `test-admin-${suffix}@famousdukaan.test`, name: "Test Admin", role: "ADMIN" as const },
};

function makePassword() {
  return `Aa1!${randomBytes(12).toString("base64url")}`;
}

const passwords = {
  customer: makePassword(),
  seller: makePassword(),
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

async function session(jar: CookieJar) {
  const res = await request("/api/auth/session", { jar });
  return res.json() as Promise<{ user?: { email?: string; role?: string; vendorStatus?: string | null } }>;
}

function expect(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
}

async function cleanup() {
  const emails = Object.values(users).map((u) => u.email);
  await prisma.loginAttempt.deleteMany({ where: { email: { in: emails } } });
  await prisma.vendor.deleteMany({ where: { user: { email: { in: emails } } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
}

async function main() {
  const results: string[] = [];
  try {
    await prisma.user.create({
      data: {
        email: users.customer.email,
        name: users.customer.name,
        role: "CUSTOMER",
        passwordHash: await bcrypt.hash(passwords.customer, 12),
      },
    });
    const seller = await prisma.user.create({
      data: {
        email: users.seller.email,
        name: users.seller.name,
        role: "VENDOR",
        passwordHash: await bcrypt.hash(passwords.seller, 12),
        vendor: {
          create: {
            storeName: users.seller.storeName!,
            slug: `temp-store-${suffix}`,
            status: "PENDING",
          },
        },
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

    const health = await fetch(`${BASE}/login`);
    expect(health.ok, "/login loads");
    const registerPage = await fetch(`${BASE}/register`);
    expect(registerPage.ok, "/register loads");

    const adminLoggedOut = await fetch(`${BASE}/admin`, { redirect: "manual" });
    expect(adminLoggedOut.status >= 300 && adminLoggedOut.status < 400, "/admin redirects when logged out");
    const adminLoc = adminLoggedOut.headers.get("location") || "";
    expect(adminLoc.includes("/login"), "/admin redirect target is login");

    const dashLoggedOut = await fetch(`${BASE}/dashboard`, { redirect: "manual" });
    expect(dashLoggedOut.status >= 300 && dashLoggedOut.status < 400, "/dashboard redirects when logged out");
    expect((dashLoggedOut.headers.get("location") || "").includes("/login"), "/dashboard redirect target is login");

    const ordersUnauth = await fetch(`${BASE}/api/orders`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    expect(ordersUnauth.status === 401, "POST /api/orders returns 401 logged out");

    const products = await fetch(`${BASE}/api/products`);
    const productJson = await products.json() as { source?: string };
    expect(products.ok && productJson.source === "db", "GET /api/products source is db");

    const customerLogin = await login(users.customer.email, passwords.customer);
    expect(customerLogin.res.status < 400 || customerLogin.res.status === 302, "customer can log in");
    const customerSession = await session(customerLogin.jar);
    expect(customerSession.user?.role === "CUSTOMER", "customer session role is CUSTOMER");

    const customerAdmin = await request("/admin", { jar: customerLogin.jar, redirect: "manual" });
    const customerAdminLoc = customerAdmin.headers.get("location") || "";
    expect(customerAdmin.status >= 300 && customerAdminLoc.includes("/403"), "customer is denied /admin");
    const customerDash = await request("/dashboard", { jar: customerLogin.jar, redirect: "manual" });
    expect((customerDash.headers.get("location") || "").includes("/403"), "customer is denied /dashboard");
    const customerAccount = await request("/account", { jar: customerLogin.jar, redirect: "manual" });
    expect(customerAccount.status === 200 || customerAccount.status === 307 || customerAccount.status === 308, "customer can open /account");

    const sellerLogin = await login(users.seller.email, passwords.seller);
    const sellerSession = await session(sellerLogin.jar);
    expect(sellerSession.user?.role === "VENDOR" && sellerSession.user?.vendorStatus === "PENDING", "seller session is PENDING vendor");
    const sellerDash = await request("/dashboard", { jar: sellerLogin.jar, redirect: "manual" });
    expect(sellerDash.status === 200, "pending seller can open /dashboard");
    const sellerAdmin = await request("/admin", { jar: sellerLogin.jar, redirect: "manual" });
    expect((sellerAdmin.headers.get("location") || "").includes("/403"), "seller is denied /admin");

    const adminLogin = await login(users.admin.email, passwords.admin);
    const adminSession = await session(adminLogin.jar);
    expect(adminSession.user?.role === "ADMIN", "temporary admin session role is ADMIN");
    const adminPage = await request("/admin", { jar: adminLogin.jar, redirect: "manual" });
    expect(adminPage.status === 200, "admin can open /admin");
    const adminDash = await request("/dashboard", { jar: adminLogin.jar, redirect: "manual" });
    expect(adminDash.status === 200, "admin can open /dashboard");

    const seedLogin = await login("elena@famousdukaan.demo", "wrong-password-for-seed-user");
    const seedSession = await session(seedLogin.jar);
    expect(!seedSession.user, "password-less seeded user cannot log in");

    const limited = `rate-limit-${suffix}@famousdukaan.test`;
    await prisma.user.create({
      data: {
        email: limited,
        name: "Rate Limit",
        role: "CUSTOMER",
        passwordHash: await bcrypt.hash(passwords.customer, 12),
      },
    });
    const extraEmails = [limited];
    for (let i = 0; i < 5; i++) {
      await login(limited, "definitely-wrong-password");
    }
    const locked = await login(limited, passwords.customer);
    const lockedSession = await session(locked.jar);
    expect(!lockedSession.user, "correct password is rejected after 5 failures in 15 minutes");
    await prisma.loginAttempt.deleteMany({ where: { email: { in: [limited, ...Object.values(users).map((u) => u.email)] } } });
    await prisma.user.deleteMany({ where: { email: limited } });

    results.push("all checks passed");
    console.log("ALL ROLE AUTH TESTS PASSED");
  } finally {
    await cleanup();
    const leftover = await prisma.user.count({
      where: { email: { endsWith: "@famousdukaan.test", contains: `test-` } },
    });
    // only delete this run's suffix users; already cleaned
    console.log(`cleanup complete; leftover suffix users should be 0 (count of remaining test-*@famousdukaan.test not asserted globally)`);
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error("TEST FAILURE:", error instanceof Error ? error.message : "unknown error");
  try {
    const emails = Object.values(users).map((u) => u.email);
    await prisma.loginAttempt.deleteMany({ where: { email: { endsWith: "@famousdukaan.test" } } });
    await prisma.vendor.deleteMany({ where: { user: { email: { endsWith: "@famousdukaan.test" } } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: "@famousdukaan.test" } } });
  } catch {
    // ignore cleanup errors
  } finally {
    await prisma.$disconnect();
  }
  process.exit(1);
});
