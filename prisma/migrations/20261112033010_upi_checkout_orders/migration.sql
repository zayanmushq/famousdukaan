-- UPI checkout fields on Order. No new tables, so no additional RLS policies.
-- Existing Order/OrderItem RLS + FORCE remains in effect.

CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUBMITTED', 'PAID', 'REJECTED');

ALTER TABLE "Order" ALTER COLUMN "vendorId" DROP NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PENDING_PAYMENT';
ALTER TABLE "Order" ALTER COLUMN "paymentMethod" SET DEFAULT 'UPI';

ALTER TABLE "Order" ADD COLUMN "orderNo" TEXT;
ALTER TABLE "Order" ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Order" ADD COLUMN "upiTxnRef" TEXT;
ALTER TABLE "Order" ADD COLUMN "paidAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "verifiedById" TEXT;

UPDATE "Order" SET "orderNo" = 'FD-LEGACY-' || "id" WHERE "orderNo" IS NULL;

ALTER TABLE "Order" ALTER COLUMN "orderNo" SET NOT NULL;

CREATE UNIQUE INDEX "Order_orderNo_key" ON "Order"("orderNo");
CREATE UNIQUE INDEX "Order_upiTxnRef_key" ON "Order"("upiTxnRef");

ALTER TABLE "Order" ADD CONSTRAINT "Order_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
