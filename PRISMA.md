# Prisma + Supabase Setup

## 1. Install Dependencies
```bash
npm install prisma @prisma/client
npx prisma generate
```

## 2. Supabase Database URL
In Supabase Dashboard → Settings → Database:

- **Connection String (URI)** → Use for `DATABASE_URL`
- **Direct Connection** → Use for `DIRECT_URL`

Add to `.env.local`:
```
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
```

## 3. Push Schema to Supabase
```bash
npx prisma db push
```

## 4. Generate Client
```bash
npx prisma generate
```

## Done
Prisma is now connected to Supabase.
Use `import { prisma } from "@/lib/prisma"` in your API routes.
