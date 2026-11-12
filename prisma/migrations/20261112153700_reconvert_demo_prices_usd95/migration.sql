-- Reconvert the original 6 demo catalog prices from USD×83 INR to USD×95 INR.
-- Source USD amounts: 248, 86, 120, 320, 68, 890.
-- Rule: multiply by 95, then round to the nearest integer ending in 9 (ties round up).
-- Guarded by id, vendorId, and the previous INR price so vendor-created products are never updated.
-- Order and OrderItem totals are intentionally not updated (0 orders at apply time).

UPDATE "Product" SET "price" = 23559, "updatedAt" = NOW() WHERE "id" = '1' AND "vendorId" = 'v1' AND "price" = 20589;
UPDATE "Product" SET "price" = 8169,  "updatedAt" = NOW() WHERE "id" = '2' AND "vendorId" = 'v2' AND "price" = 7139;
UPDATE "Product" SET "price" = 11399, "updatedAt" = NOW() WHERE "id" = '3' AND "vendorId" = 'v1' AND "price" = 9959;
UPDATE "Product" SET "price" = 30399, "updatedAt" = NOW() WHERE "id" = '4' AND "vendorId" = 'v3' AND "price" = 26559;
UPDATE "Product" SET "price" = 6459,  "updatedAt" = NOW() WHERE "id" = '5' AND "vendorId" = 'v2' AND "price" = 5649;
UPDATE "Product" SET "price" = 84549, "updatedAt" = NOW() WHERE "id" = '6' AND "vendorId" = 'v4' AND "price" = 73869;
