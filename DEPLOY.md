# FamousDukaan — Deployment Guide

## 1. Supabase Setup
1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy Project URL and Anon Key
3. Run the Prisma schema (or create tables manually)

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
1. Push code to GitHub
2. Import project in [vercel.com](https://vercel.com)
3. Add all environment variables from `.env.example`
4. Deploy

## 4. Required Environment Variables on Vercel
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (your vercel domain)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

## Ready for Production
- Authentication: NextAuth.js ✅
- Database: Supabase ✅
- Deployment: Vercel ✅
- Payments: Razorpay ready ✅
