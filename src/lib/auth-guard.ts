import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";

export async function getAuthSession() {
  return getServerSession(authOptions);
}

export async function requireAuth(callbackUrl = "/") {
  const session = await getAuthSession();
  if (!session?.user) {
    const login = callbackUrl && callbackUrl !== "/" ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login";
    redirect(login);
  }
  return session;
}

export async function requireRole(roles: Role[], callbackUrl = "/") {
  const session = await requireAuth(callbackUrl);
  if (!roles.includes(session.user.role)) {
    redirect("/403");
  }
  return session;
}

export async function requireApiSession() {
  const session = await getAuthSession();
  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session, error: null };
}

export async function requireApiRole(roles: Role[]) {
  const result = await requireApiSession();
  if (result.error || !result.session) return result;
  if (!roles.includes(result.session.user.role)) {
    return {
      session: result.session,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return result;
}
