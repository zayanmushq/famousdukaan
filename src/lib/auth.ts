import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getClientIp, normalizeEmail } from "@/lib/request-ip";
import { isLoginRateLimited, recordLoginAttempt } from "@/lib/rate-limit";

export const RATE_LIMIT_ERROR = "TOO_MANY_ATTEMPTS";

// Timing-safe dummy so missing users still pay a bcrypt compare.
const DUMMY_HASH = bcrypt.hashSync("__famousdukaan_timing_dummy__", 12);

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const email = normalizeEmail(credentials?.email || "");
        const password = credentials?.password || "";
        if (!email || !password) return null;

        const ip = getClientIp(req);
        if (await isLoginRateLimited(email, ip)) {
          throw new Error(RATE_LIMIT_ERROR);
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { vendor: { select: { id: true, status: true } } },
        });

        const hash = user?.passwordHash || DUMMY_HASH;
        const matches = await bcrypt.compare(password, hash);
        const ok = Boolean(user && user.passwordHash && matches);

        await recordLoginAttempt(email, ip, ok);
        if (!ok) return null;

        return {
          id: user!.id,
          email: user!.email,
          name: user!.name,
          role: user!.role,
          vendorId: user!.vendor?.id ?? null,
          vendorStatus: user!.vendor?.status ?? null,
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.vendorId = user.vendorId ?? null;
        token.vendorStatus = user.vendorStatus ?? null;
      }
      if (token.id) {
        try {
          const fresh = await prisma.user.findUnique({
            where: { id: String(token.id) },
            include: { vendor: { select: { id: true, status: true } } },
          });
          if (fresh) {
            token.role = fresh.role;
            token.vendorId = fresh.vendor?.id ?? null;
            token.vendorStatus = fresh.vendor?.status ?? null;
          }
        } catch {
          // Keep the existing token if the database is briefly unavailable.
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.vendorId = token.vendorId ?? null;
        session.user.vendorStatus = token.vendorStatus ?? null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
