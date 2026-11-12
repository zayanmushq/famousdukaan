import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { SITE_URL } from "@/lib/seo";

const PRODUCTION_VERCEL_HOST = "famousdukaan.vercel.app";

function redirectVercelAppAlias(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  if (host !== PRODUCTION_VERCEL_HOST) return null;
  const destination = new URL(request.nextUrl.pathname + request.nextUrl.search, SITE_URL);
  return NextResponse.redirect(destination, 308);
}

const customerPrefixes = ["/account", "/orders", "/wishlist", "/checkout"];
const vendorPrefixes = ["/dashboard"];
const adminPrefixes = ["/admin"];

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function proxy(request: NextRequest) {
  const aliasRedirect = redirectVercelAppAlias(request);
  if (aliasRedirect) return aliasRedirect;

  const { pathname } = request.nextUrl;
  const isOrdersApi = pathname === "/api/orders" || pathname.startsWith("/api/orders/");
  const isProductsWrite =
    (pathname === "/api/products" || pathname.startsWith("/api/products/")) &&
    request.method !== "GET" &&
    request.method !== "HEAD" &&
    request.method !== "OPTIONS";
  const isAdminApi = pathname === "/api/admin" || pathname.startsWith("/api/admin/");
  const isVendorApi = pathname === "/api/vendor" || pathname.startsWith("/api/vendor/");
  const needsLogin = startsWithAny(pathname, [...customerPrefixes, ...vendorPrefixes, ...adminPrefixes]);

  if (!isOrdersApi && !isProductsWrite && !isAdminApi && !isVendorApi && !needsLogin) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const isLoggedIn = Boolean(token?.id || token?.email);
  const role = token?.role;

  if (isOrdersApi) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (isProductsWrite) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (role !== "VENDOR" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (isAdminApi) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (isVendorApi) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (role !== "VENDOR" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (needsLogin && !isLoggedIn) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  if (startsWithAny(pathname, adminPrefixes) && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/403", request.url));
  }

  if (startsWithAny(pathname, vendorPrefixes) && role !== "VENDOR" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/403", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|svg|webp)$).*)",
  ],
};
