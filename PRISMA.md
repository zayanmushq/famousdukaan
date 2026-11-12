# Prisma + Supabase Setup

The app uses Prisma against the `famousdukaan` Supabase project (region `ap-south-1`).

## Environment variables

Add these to `.env.local` (local) and Vercel (Production, Preview, Development):

```
DATABASE_URL="postgresql://prisma.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
DIRECT_URL="postgresql://prisma.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."   # server-only; optional until auth uses it
```

- `DATABASE_URL` is the **transaction** pooler (port 6543). `pgbouncer=true` disables prepared statements; `connection_limit=1` is for serverless.
- `DIRECT_URL` is the **session** pooler (port 5432), used for Prisma migrations. The shared pooler is used because the direct `db.[ref].supabase.co` host is IPv6-only on the free plan.
- Use the `prisma` database role (BYPASSRLS), not `postgres`. The Management SQL API cannot reset the privileged `postgres` role password.

Copy the exact pooler hostname from Supabase Dashboard → Connect; do not invent the `aws-[index]` segment.

## Migrations

```bash
npx prisma migrate dev --name <name>
npx prisma migrate deploy   # production / Vercel build
npx prisma generate
npx prisma db seed
```

## Row Level Security

All public application tables have RLS enabled and **no permissive policies**. That is intentional:

- The Next.js app reads and writes through Prisma as the `prisma` role, which has `BYPASSRLS`, so policies are not required for the app to work.
- The Supabase Data API (`anon` / `authenticated`) therefore sees zero rows, which keeps the tables closed until Auth policies are added later.

Do not add `USING (true)` policies "to make advisors green" unless you also intend to expose those tables on the Data API.

## Fallback

Catalog pages and `GET /api/products` use Prisma first and fall back to `src/lib/data.ts` if `DATABASE_URL` is missing or a query fails. `/api/products` returns `{ source: "db" | "demo", products }` and an `X-Data-Source` header.
