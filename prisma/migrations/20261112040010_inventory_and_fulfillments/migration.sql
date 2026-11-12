-- Inventory fields, fulfillments, movements, and cancel/refund metadata.

CREATE TYPE "FulfillmentStatus" AS ENUM ('AWAITING_PAYMENT', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED');
CREATE TYPE "InventoryMovementType" AS ENUM ('RESERVE', 'RELEASE', 'ADJUST');

ALTER TABLE "Product" ADD COLUMN "sku" TEXT;
ALTER TABLE "Product" ADD COLUMN "lowStockThreshold" INTEGER NOT NULL DEFAULT 5;

CREATE UNIQUE INDEX "Product_vendorId_sku_key" ON "Product"("vendorId", "sku");

ALTER TABLE "Order" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "cancelReason" TEXT;
ALTER TABLE "Order" ADD COLUMN "refundMarkedAt" TIMESTAMP(3);

CREATE INDEX "Order_paymentStatus_status_createdAt_idx" ON "Order"("paymentStatus", "status", "createdAt");

CREATE TABLE "OrderFulfillment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "status" "FulfillmentStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "trackingNumber" TEXT,
    "packedAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrderFulfillment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderFulfillment_vendorId_status_idx" ON "OrderFulfillment"("vendorId", "status");
CREATE INDEX "OrderFulfillment_orderId_idx" ON "OrderFulfillment"("orderId");

ALTER TABLE "OrderFulfillment" ADD CONSTRAINT "OrderFulfillment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderFulfillment" ADD CONSTRAINT "OrderFulfillment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderItem" ADD COLUMN "fulfillmentId" TEXT;

-- Backfill one fulfillment per vendor on each existing order.
INSERT INTO "OrderFulfillment" ("id", "orderId", "vendorId", "status", "createdAt", "updatedAt")
SELECT
    'ff_' || md5("OrderItem"."orderId" || ':' || "Product"."vendorId"),
    "OrderItem"."orderId",
    "Product"."vendorId",
    CASE
        WHEN "Order"."paymentStatus" = 'PAID' AND "Order"."status" = 'DELIVERED' THEN 'DELIVERED'::"FulfillmentStatus"
        WHEN "Order"."paymentStatus" = 'PAID' AND "Order"."status" = 'SHIPPED' THEN 'SHIPPED'::"FulfillmentStatus"
        WHEN "Order"."paymentStatus" = 'PAID' AND "Order"."status" = 'CANCELLED' THEN 'CANCELLED'::"FulfillmentStatus"
        WHEN "Order"."paymentStatus" = 'PAID' THEN 'CONFIRMED'::"FulfillmentStatus"
        WHEN "Order"."status" = 'CANCELLED' THEN 'CANCELLED'::"FulfillmentStatus"
        ELSE 'AWAITING_PAYMENT'::"FulfillmentStatus"
    END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "OrderItem"
JOIN "Product" ON "Product"."id" = "OrderItem"."productId"
JOIN "Order" ON "Order"."id" = "OrderItem"."orderId"
GROUP BY "OrderItem"."orderId", "Product"."vendorId", "Order"."paymentStatus", "Order"."status";

UPDATE "OrderItem"
SET "fulfillmentId" = 'ff_' || md5("OrderItem"."orderId" || ':' || "Product"."vendorId")
FROM "Product"
WHERE "Product"."id" = "OrderItem"."productId";

ALTER TABLE "OrderItem" ALTER COLUMN "fulfillmentId" SET NOT NULL;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_fulfillmentId_fkey" FOREIGN KEY ("fulfillmentId") REFERENCES "OrderFulfillment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderId" TEXT,
    "fulfillmentId" TEXT,
    "type" "InventoryMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InventoryMovement_productId_createdAt_idx" ON "InventoryMovement"("productId", "createdAt");
CREATE INDEX "InventoryMovement_orderId_idx" ON "InventoryMovement"("orderId");

ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_fulfillmentId_fkey" FOREIGN KEY ("fulfillmentId") REFERENCES "OrderFulfillment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
