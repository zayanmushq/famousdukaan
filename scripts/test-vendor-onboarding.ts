/**
 * Vendor onboarding checks against a running local server.
 * Creates temporary users, vendors, and products (passwords never printed),
 * then deletes only that temp data. Demo vendors are left APPROVED.
 */
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = process.env.AUTH_TEST_BASE_URL || process.env.UPI_TEST_BASE_URL || "http://127.0.0.1:3000";
const suffix = randomBytes(6).toString("hex");
const users = {
  applicant: { email: `test-vo-applicant-${suffix}@famousdukaan.test`, name: "VO Applicant" },
  other: { email: `test-vo-other-${suffix}@famousdukaan.test`, name: "VO Other" },
  admin: { email: `test-vo-admin-${suffix}@famousdukaan.test`, name: "VO Admin" },
};

function makePassword() {
  return `Aa1!${randomBytes(12).toString("base64url")}`;
}
const passwords = {
  applicant: makePassword(),
  other: makePassword(),
  admin: makePassword(),
};

type CookieJar = Map<string, string>;
const emails = Object.values(users).map((u) => u.email);
const applicantSlug = `temp-vo-${suffix}`;
const otherSlug = `temp-vo-other-${suffix}`;
let applicantVendorId = "";
let otherVendorId = "";
let tempProductId = "";
let failed = 0;

function expect(condition: boolean, message: string) {
  if (condition) {
    console.log(`ok  - ${message}`);
  } else {
    failed += 1;
    console.error(`fail - ${message}`);
  }
}

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
async function json<T>(res: Response) {
  const text = await res.text();
  if (!text) {
    throw new Error(`Empty response body (status ${res.status})`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Non-JSON response (status ${res.status}): ${text.slice(0, 200)}`);
  }
}
async function readPage(res: Response) {
  const text = await res.text();
  return { res, text, status: res.status };
}
function isPublicProductPage(html: string, productName: string) {
  return html.includes(productName) && !html.includes("Product not found");
}

const validApply = {
  storeName: `Temp VO Shop ${suffix}`,
  slug: applicantSlug,
  description: "Handmade goods from a temporary test shop used only in automated checks.",
  contactPhone: "9876543210",
  pickupCity: "Bengaluru",
  pickupState: "Karnataka",
  pickupPincode: "560001",
  pan: "ABCDE1234F",
  gstin: "27ABCDE1234F1Z5",
  bankAccountHolder: "Temp VO Shop",
  bankIfsc: "HDFC0001234",
  bankAccountNumber: "12345678901",
};

async function cleanup() {
  const vendors = await prisma.vendor.findMany({
    where: { slug: { in: [applicantSlug, otherSlug] } },
    select: { id: true },
  });
  const vendorIds = vendors.map((v) => v.id);
  const products = vendorIds.length
    ? await prisma.product.findMany({ where: { vendorId: { in: vendorIds } }, select: { id: true } })
    : [];
  const productIds = products.map((p) => p.id);
  if (productIds.length) {
    await prisma.inventoryMovement.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  }
  if (vendorIds.length) {
    await prisma.vendor.deleteMany({ where: { id: { in: vendorIds } } });
  }
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
}

async function main() {
  await cleanup();
  await prisma.user.create({
    data: {
      email: users.admin.email,
      name: users.admin.name,
      role: "ADMIN",
      passwordHash: await bcrypt.hash(passwords.admin, 12),
    },
  });
  const other = await prisma.user.create({
    data: {
      email: users.other.email,
      name: users.other.name,
      role: "VENDOR",
      passwordHash: await bcrypt.hash(passwords.other, 12),
      vendor: {
        create: {
          storeName: `Other VO Shop ${suffix}`,
          slug: otherSlug,
          status: "APPROVED",
          description: "Second shop used to prove ownership checks.",
        },
      },
    },
    include: { vendor: true },
  });
  otherVendorId = other.vendor!.id;
  const otherProduct = await prisma.product.create({
    data: {
      vendorId: otherVendorId,
      name: `Other VO Product ${suffix}`,
      slug: `other-vo-product-${suffix}`,
      description: "Owned by the other vendor",
      price: 199,
      stock: 5,
      images: ["https://example.com/other.jpg"],
      category: "Home",
      status: "ACTIVE",
    },
  });

  const sellPage = await readPage(await request("/sell"));
  expect(sellPage.status === 200, "GET /sell is public");
  const applyRedirect = await readPage(await request("/vendor/apply", { redirect: "manual" }));
  const applyLoc = applyRedirect.res.headers.get("location") || "";
  expect((applyRedirect.status === 307 || applyRedirect.status === 308) && applyLoc.includes("/sell"), "GET /vendor/apply redirects to /sell");

  const badCases: { field: string; override: Record<string, string>; label: string }[] = [
    { field: "pan", override: { pan: "ABC" }, label: "rejects invalid PAN" },
    { field: "gstin", override: { gstin: "INVALID" }, label: "rejects invalid GSTIN" },
    { field: "bankIfsc", override: { bankIfsc: "XXXX" }, label: "rejects invalid IFSC" },
    { field: "pickupPincode", override: { pickupPincode: "12" }, label: "rejects invalid pincode" },
  ];
  for (const item of badCases) {
    const res = await request("/api/sell", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...validApply,
        ...item.override,
        name: users.applicant.name,
        email: users.applicant.email,
        password: passwords.applicant,
        slug: `${applicantSlug}-bad`,
      }),
    });
    expect(res.status === 400, item.label);
  }

  const applyRes = await request("/api/sell", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...validApply,
      name: users.applicant.name,
      email: users.applicant.email,
      password: passwords.applicant,
    }),
  });
  const applyJson = await json<{ application?: { id: string; status: string; bankAccountMasked?: string | null; bankAccountCipher?: string; bankAccountNumber?: string }; error?: string }>(applyRes);
  expect(applyRes.status === 201 && applyJson.application?.status === "PENDING", "valid application is stored as PENDING");
  expect(applyJson.application?.bankAccountMasked === "XXXXXX8901", "response shows masked account last-4");
  expect(!("bankAccountCipher" in (applyJson.application || {})) && !("bankAccountNumber" in (applyJson.application || {})), "full account number and cipher are not returned");
  applicantVendorId = applyJson.application?.id || "";

  const createdUser = await prisma.user.findUnique({ where: { email: users.applicant.email } });
  expect(createdUser?.role === "CUSTOMER", "applicant remains CUSTOMER until approved");
  const storedVendor = await prisma.vendor.findUnique({ where: { id: applicantVendorId } });
  expect(Boolean(storedVendor?.bankAccountCipher) && storedVendor?.bankAccountLast4 === "8901", "account number is stored encrypted with last-4");
  expect(storedVendor?.bankAccountCipher !== validApply.bankAccountNumber, "cipher is not the raw account number");

  const pendingLogin = await login(users.applicant.email, passwords.applicant);
  const pendingSessionRes = await request("/api/auth/session", { jar: pendingLogin.jar });
  const pendingSession = await json<{ user?: { role?: string; vendorStatus?: string } }>(pendingSessionRes);
  expect(pendingSession.user?.role === "CUSTOMER" && pendingSession.user?.vendorStatus === "PENDING", "pending applicant session stays CUSTOMER");
  const pendingDash = await readPage(await request("/dashboard", { jar: pendingLogin.jar, redirect: "manual" }));
  expect((pendingDash.res.headers.get("location") || "").includes("/403"), "pending applicant cannot open the vendor dashboard");
  const pendingCreate = await request("/api/vendor/products", {
    method: "POST",
    jar: pendingLogin.jar,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Nope", category: "Home", price: 100, status: "ACTIVE", stock: 1 }),
  });
  expect(pendingCreate.status === 401 || pendingCreate.status === 403, "pending applicant cannot create products");

  const adminLogin = await login(users.admin.email, passwords.admin);
  const rejectNoReason = await request(`/api/admin/vendors/${applicantVendorId}`, {
    method: "PATCH",
    jar: adminLogin.jar,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "reject" }),
  });
  expect(rejectNoReason.status === 400, "admin reject requires a reason");
  const approveRes = await request(`/api/admin/vendors/${applicantVendorId}`, {
    method: "PATCH",
    jar: adminLogin.jar,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "approve" }),
  });
  const approveJson = await json<{ vendor?: { status: string; reviewedById?: string | null; user?: { role: string } } }>(approveRes);
  expect(approveRes.status === 200 && approveJson.vendor?.status === "APPROVED", "admin can approve an application");
  expect(approveJson.vendor?.user?.role === "VENDOR" && Boolean(approveJson.vendor?.reviewedById), "approval sets VENDOR role and audit reviewer");

  const approvedLogin = await login(users.applicant.email, passwords.applicant);
  const approvedSessionRes = await request("/api/auth/session", { jar: approvedLogin.jar });
  const approvedSession = await json<{ user?: { role?: string; vendorStatus?: string } }>(approvedSessionRes);
  expect(approvedSession.user?.role === "VENDOR" && approvedSession.user?.vendorStatus === "APPROVED", "approved applicant session is VENDOR");
  const dash = await readPage(await request("/dashboard", { jar: approvedLogin.jar, redirect: "manual" }));
  expect(dash.status === 200, "approved vendor can open the dashboard");

  const createDraft = await request("/api/vendor/products", {
    method: "POST",
    jar: approvedLogin.jar,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: `VO Draft ${suffix}`,
      description: "Temporary draft product",
      category: "Home",
      price: 499,
      comparePrice: 599,
      stock: 4,
      images: ["https://example.com/draft.jpg"],
      countryOfOrigin: "India",
      status: "DRAFT",
    }),
  });
  const draftJson = await json<{ product?: { id: string; status: string; stock: number } }>(createDraft);
  tempProductId = draftJson.product?.id || "";
  expect(createDraft.status === 201 && draftJson.product?.status === "DRAFT" && draftJson.product?.stock === 4, "vendor can create a DRAFT product with stock");

  const catalogAfterDraft = await request("/api/products");
  const catalogDraft = await json<{ products?: { id: string }[] }>(catalogAfterDraft);
  expect(!(catalogDraft.products || []).some((p) => p.id === tempProductId), "DRAFT products are hidden from the catalog API");
  const draftPage = await readPage(await request(`/product/${tempProductId}`, { redirect: "manual" }));
  expect((draftPage.status === 404 || !isPublicProductPage(draftPage.text, `VO Draft ${suffix}`)), "DRAFT product page is not public");
  const sitemapDraft = await request("/sitemap.xml");
  const sitemapDraftXml = await sitemapDraft.text();
  expect(!sitemapDraftXml.includes(`/product/${tempProductId}`), "DRAFT products are hidden from the sitemap");

  const activate = await request(`/api/vendor/products/${tempProductId}`, {
    method: "PATCH",
    jar: approvedLogin.jar,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "ACTIVE" }),
  });
  expect(activate.status === 200, "vendor can publish their own product");
  const catalogActive = await json<{ products?: { id: string }[] }>(await request("/api/products"));
  expect((catalogActive.products || []).some((p) => p.id === tempProductId), "ACTIVE products appear in the catalog");

  const archive = await request(`/api/vendor/products/${tempProductId}`, {
    method: "PATCH",
    jar: approvedLogin.jar,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "ARCHIVED" }),
  });
  const archiveJson = await json<{ product?: { status: string } }>(archive);
  expect(archive.status === 200 && archiveJson.product?.status === "ARCHIVED", "vendor can archive their own product");
  const catalogArchived = await json<{ products?: { id: string }[] }>(await request("/api/products"));
  expect(!(catalogArchived.products || []).some((p) => p.id === tempProductId), "ARCHIVED products are hidden from the catalog");
  const archivedPage = await readPage(await request(`/product/${tempProductId}`, { redirect: "manual" }));
  expect((archivedPage.status === 404 || !isPublicProductPage(archivedPage.text, `VO Draft ${suffix}`)), "ARCHIVED product page is not public");
  const sitemapArchived = await request("/sitemap.xml");
  const sitemapArchivedXml = await sitemapArchived.text();
  expect(!sitemapArchivedXml.includes(`/product/${tempProductId}`), "ARCHIVED products are hidden from the sitemap");

  const stockRes = await request(`/api/vendor/products/${tempProductId}`, {
    method: "PATCH",
    jar: approvedLogin.jar,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ stock: 11 }),
  });
  const stockJson = await json<{ product?: { stock: number; status: string } }>(stockRes);
  expect(stockRes.status === 200 && stockJson.product?.stock === 11 && stockJson.product?.status === "ARCHIVED", "stock adjustment on an archived product does not publish it");
  const movement = await prisma.inventoryMovement.findFirst({
    where: { productId: tempProductId, type: "ADJUST", balanceAfter: 11 },
    orderBy: { createdAt: "desc" },
  });
  expect(Boolean(movement) && movement?.quantity === 7, "stock change is logged as an InventoryMovement ADJUST");

  const editOther = await request(`/api/vendor/products/${otherProduct.id}`, {
    method: "PATCH",
    jar: approvedLogin.jar,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Hijacked" }),
  });
  expect(editOther.status === 403, "vendor cannot edit another vendor's product");
  const untouched = await prisma.product.findUnique({ where: { id: otherProduct.id } });
  expect(untouched?.name === `Other VO Product ${suffix}`, "other vendor's product name is unchanged");

  const demo = await prisma.vendor.findMany({
    where: { id: { in: ["v1", "v2", "v3", "v4"] } },
    select: { id: true, status: true },
  });
  expect(demo.length === 4 && demo.every((v) => v.status === "APPROVED"), "existing demo vendors remain APPROVED");

  const vendorPage = await readPage(await request(`/vendor/${applicantVendorId}`, { redirect: "manual" }));
  expect(vendorPage.status === 200, "approved vendor appears on the public vendor page");
  const sitemapVendors = await request("/sitemap.xml");
  const sitemapXml = await sitemapVendors.text();
  expect(sitemapXml.includes(`/vendor/${applicantVendorId}`), "approved vendor is included in the sitemap");
  expect(sitemapXml.includes("/sell"), "sell application page is included in the sitemap");
}

main()
  .catch((error) => {
    console.error(error);
    failed += 1;
  })
  .finally(async () => {
    try {
      await cleanup();
      console.log("temp vendor-onboarding data cleaned up");
    } catch (error) {
      console.error("cleanup failed", error);
      failed += 1;
    }
    await prisma.$disconnect();
    if (failed) {
      console.error(`\n${failed} vendor onboarding check(s) failed`);
      process.exit(1);
    }
    console.log("\nAll vendor onboarding checks passed");
  });
