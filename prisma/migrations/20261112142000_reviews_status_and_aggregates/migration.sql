-- Review workflow: unique buyer review, 1-5 check, optional order, visibility, RLS, and recomputed aggregates.

CREATE TYPE "ReviewStatus" AS ENUM ('VISIBLE', 'HIDDEN');

ALTER TABLE "Review" ADD COLUMN "orderId" TEXT;
ALTER TABLE "Review" ADD COLUMN "status" "ReviewStatus" NOT NULL DEFAULT 'VISIBLE';
ALTER TABLE "Review" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5);

CREATE UNIQUE INDEX "Review_userId_productId_key" ON "Review"("userId", "productId");
CREATE INDEX "Review_productId_status_idx" ON "Review"("productId", "status");
CREATE INDEX "Review_orderId_idx" ON "Review"("orderId");

ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Keep the 3 seed demo reviews but hide them so they are not shown or marked up.
UPDATE "Review"
SET "status" = 'HIDDEN', "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN ('r-1-u-elena', 'r-1-u-james', 'r-2-u-sofia');

-- Recompute product aggregates from VISIBLE reviews only (zero => 0/0).
UPDATE "Product" AS p
SET
  "reviewCount" = COALESCE(stats.cnt, 0),
  "rating" = COALESCE(stats.avg, 0)
FROM (
  SELECT
    pr.id,
    COUNT(r.id)::integer AS cnt,
    AVG(r.rating)::double precision AS avg
  FROM "Product" pr
  LEFT JOIN "Review" r ON r."productId" = pr.id AND r.status = 'VISIBLE'
  GROUP BY pr.id
) AS stats
WHERE p.id = stats.id;

-- Recompute vendor aggregates from VISIBLE reviews on their products (zero => 0).
UPDATE "Vendor" AS v
SET "rating" = COALESCE(stats.avg, 0)
FROM (
  SELECT
    vend.id,
    AVG(r.rating)::double precision AS avg
  FROM "Vendor" vend
  LEFT JOIN "Product" pr ON pr."vendorId" = vend.id
  LEFT JOIN "Review" r ON r."productId" = pr.id AND r.status = 'VISIBLE'
  GROUP BY vend.id
) AS stats
WHERE v.id = stats.id;

-- Public can read VISIBLE reviews. service_role has full access for admin/Data API use.
-- The Next.js app writes reviews through the prisma role (BYPASSRLS), so these
-- policies do not affect server-side Prisma. Own-row INSERT/UPDATE policies that
-- compare auth.uid() to "userId" are omitted: the migrator role cannot reference
-- schema auth, and Supabase Auth IDs are not the app's NextAuth user ids, so those
-- policies would not authorize real customers anyway. FORCE RLS still blocks
-- unprivileged Data API writes.
CREATE POLICY "review_select_visible" ON "Review"
  FOR SELECT
  TO public
  USING (status = 'VISIBLE');

CREATE POLICY "review_admin_all" ON "Review"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
