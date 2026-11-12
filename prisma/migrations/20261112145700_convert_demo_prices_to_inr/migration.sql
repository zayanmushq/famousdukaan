-- Convert USD-like demo catalog Product.price values to INR.
-- Rule: multiply by 83, then round to the nearest integer ending in 9 (ties round up).
-- Order and OrderItem totals are intentionally not updated.

UPDATE "Product" SET "price" = 20589 WHERE "id" = '1' AND "price" = 248;
UPDATE "Product" SET "price" = 7139  WHERE "id" = '2' AND "price" = 86;
UPDATE "Product" SET "price" = 9959  WHERE "id" = '3' AND "price" = 120;
UPDATE "Product" SET "price" = 26559 WHERE "id" = '4' AND "price" = 320;
UPDATE "Product" SET "price" = 5649  WHERE "id" = '5' AND "price" = 68;
UPDATE "Product" SET "price" = 73869 WHERE "id" = '6' AND "price" = 890;
