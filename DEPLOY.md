# FamousDukaan — Deployment Guide

## 1. Supabase + Prisma

1. Use the existing `famousdukaan` Supabase project (or create one in `ap-south-1`).
2. Apply Prisma migrations (`prisma migrate deploy` runs automatically on Vercel build).
3. Seed demo catalog data with `npx prisma db seed` when standing up a new database.
4. See `PRISMA.md` for connection strings, the `prisma` role, and RLS.

## 2. NextAuth Setup

```bash
npm install next-auth @supabase/supabase-js
```

Add to `.env.local`:

```
NEXTAUTH_SECRET=generate-a-random-string
NEXTAUTH_URL=http://localhost:3000
```

## 3. Vercel Deployment

1. Push code to GitHub (`main` deploys automatically).
2. Confirm environment variables below are set for Production, Preview, and Development.
3. The build command is `prisma generate && prisma migrate deploy && next build`.

## 4. Required Environment Variables on Vercel

- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `DATABASE_URL` (transaction pooler, port 6543, `pgbouncer=true&connection_limit=1`)
- `DIRECT_URL` (session pooler, port 5432, used by `migrate deploy`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; add when Auth starts using it)
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` (when payments go live)
- `RAZORPAY_KEY_SECRET` (when payments go live)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (optional)

Never commit `.env`, `.env.local`, or other secret files. `.gitignore` already ignores `.env*` except `.env.example`.

## Ready for Production

- Authentication: NextAuth.js (credentials still demo; Google when keys are set)
- Database: Supabase Postgres via Prisma
- Deployment: Vercel
- Payments: Razorpay ready
