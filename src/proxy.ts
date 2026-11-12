import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const customerPrefixes = ["/account", "/orders", "/wishlist", "/checkout"];
const vendorPrefixes = ["/dashboard"];
const adminPrefixes = ["/admin"];

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const isLoggedIn = Boolean(token?.id || token?.email);
  const role = token?.role;

  const isOrdersApi = pathname === "/api/orders" || pathname.startsWith("/api/orders/");
  const isProductsWrite =
    (pathname === "/api/products" || pathname.startsWith("/api/products/")) &&
    request.method !== "GET" &&
    request.method !== "HEAD" &&
    request.method !== "OPTIONS";

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

  const isAdminApi = pathname === "/api/admin" || pathname.startsWith("/api/admin/");
  if (isAdminApi) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  const isVendorApi = pathname === "/api/vendor" || pathname.startsWith("/api/vendor/");
  if (isVendorApi) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (role !== "VENDOR" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  const needsLogin = startsWithAny(pathname, [...customerPrefixes, ...vendorPrefixes, ...adminPrefixes]);
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
    "/account",
    "/account/:path*",
    "/orders",
    "/orders/:path*",
    "/wishlist",
    "/wishlist/:path*",
    "/checkout",
    "/checkout/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/admin",
    "/admin/:path*",
    "/api/orders",
    "/api/orders/:path*",
    "/api/products",
    "/api/products/:path*",
    "/api/admin",
    "/api/admin/:path*",
    "/api/vendor",
    "/api/vendor/:path*",
  ],
};
