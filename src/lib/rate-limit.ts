import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/request-ip";

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_MAX_FAILURES = 5;

export async function isLoginRateLimited(email: string, ip: string) {
  const since = new Date(Date.now() - LOGIN_WINDOW_MS);
  const failures = await prisma.loginAttempt.count({
    where: {
      email: normalizeEmail(email),
      ip,
      success: false,
      createdAt: { gte: since },
    },
  });
  return failures >= LOGIN_MAX_FAILURES;
}

export async function recordLoginAttempt(email: string, ip: string, success: boolean) {
  await prisma.loginAttempt.create({
    data: {
      email: normalizeEmail(email),
      ip,
      success,
    },
  });
}
