-- Add PENDING_PAYMENT to OrderStatus.
-- This must be in its own migration so the new value is committed before it is used.
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT';
