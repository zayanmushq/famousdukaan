-- Enable Row Level Security on all public application tables (and Prisma's
-- migration history table). No permissive policies are created.
--
-- The Next.js app uses Prisma as the `prisma` database role, which was created
-- WITH BYPASSRLS, so these policies are not required for the application to
-- read or write data. FORCE RLS is applied so even table owners are subject to
-- RLS unless they have BYPASSRLS.
--
-- The Supabase Data API (anon / authenticated) therefore sees zero rows until
-- explicit policies are added for a future Auth-backed access model.

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vendor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Wishlist" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Vendor" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Product" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Order" FORCE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Review" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Wishlist" FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = '_prisma_migrations'
  ) THEN
    EXECUTE 'ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE "_prisma_migrations" FORCE ROW LEVEL SECURITY';
  END IF;
END $$;
