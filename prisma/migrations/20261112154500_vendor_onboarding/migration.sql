-- AlterEnum
ALTER TYPE "ProductStatus" ADD VALUE 'ARCHIVED';

-- AlterTable
ALTER TABLE "Vendor"
  ADD COLUMN "contactPhone" TEXT,
  ADD COLUMN "pickupCity" TEXT,
  ADD COLUMN "pickupState" TEXT,
  ADD COLUMN "pickupPincode" TEXT,
  ADD COLUMN "pan" TEXT,
  ADD COLUMN "gstin" TEXT,
  ADD COLUMN "bankAccountHolder" TEXT,
  ADD COLUMN "bankIfsc" TEXT,
  ADD COLUMN "bankAccountLast4" TEXT,
  ADD COLUMN "bankAccountCipher" TEXT,
  ADD COLUMN "statusReason" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedById" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "countryOfOrigin" TEXT;

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Vendor_status_idx" ON "Vendor"("status");

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed demo categories already used by the catalog
INSERT INTO "Category" ("id", "slug", "name") VALUES
  ('cat-bags', 'bags', 'Bags'),
  ('cat-home', 'home', 'Home'),
  ('cat-apparel', 'apparel', 'Apparel'),
  ('cat-lighting', 'lighting', 'Lighting'),
  ('cat-accessories', 'accessories', 'Accessories');

-- RLS (no auth.uid(); prisma migrator cannot use schema auth)
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Public can read categories" ON "Category" FOR SELECT USING (true);
CREATE POLICY "Service role full access to categories" ON "Category" FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT SELECT ON TABLE "Category" TO anon, authenticated;
GRANT ALL ON TABLE "Category" TO service_role;
