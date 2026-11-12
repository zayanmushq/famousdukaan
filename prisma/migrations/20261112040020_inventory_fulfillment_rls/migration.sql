-- Enable RLS on new tables with no permissive policies.
-- The app uses Prisma as the `prisma` role (BYPASSRLS). The Data API sees zero rows.

ALTER TABLE "OrderFulfillment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderFulfillment" FORCE ROW LEVEL SECURITY;
ALTER TABLE "InventoryMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryMovement" FORCE ROW LEVEL SECURITY;
