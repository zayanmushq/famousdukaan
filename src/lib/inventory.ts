import type { FulfillmentStatus, OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const UNPAID_EXPIRY_MS = 24 * 60 * 60 * 1000;

export class OutOfStockError extends Error {
  constructor(message = "One or more items are out of stock") {
    super(message);
    this.name = "OutOfStockError";
  }
}

type Db = Prisma.TransactionClient | typeof prisma;

export function rollupOrderStatus(
  paymentStatus: string,
  fulfillments: { status: FulfillmentStatus }[],
  cancelledAt: Date | null = null
): OrderStatus {
  if (cancelledAt || (fulfillments.length > 0 && fulfillments.every((f) => f.status === "CANCELLED"))) {
    return "CANCELLED";
  }
  if (paymentStatus !== "PAID") {
    return "PENDING_PAYMENT";
  }
  const active = fulfillments.filter((f) => f.status !== "CANCELLED");
  if (active.length === 0) return "CANCELLED";

  const has = (status: FulfillmentStatus) => active.some((f) => f.status === status);
  const allAtLeast = (...statuses: FulfillmentStatus[]) => active.every((f) => statuses.includes(f.status));

  if (active.every((f) => f.status === "DELIVERED")) return "DELIVERED";
  if (has("DELIVERED")) return "PARTIALLY_DELIVERED";
  if (allAtLeast("SHIPPED", "DELIVERED") && has("SHIPPED")) return "SHIPPED";
  if (has("SHIPPED")) return "PARTIALLY_SHIPPED";
  if (allAtLeast("PACKED", "SHIPPED", "DELIVERED") && has("PACKED")) return "PACKED";
  return "CONFIRMED";
}

export async function syncOrderStatus(tx: Prisma.TransactionClient, orderId: string) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { fulfillments: { select: { status: true } } },
  });
  if (!order) return null;
  const status = rollupOrderStatus(order.paymentStatus, order.fulfillments, order.cancelledAt);
  if (status === order.status) return order;
  return tx.order.update({ where: { id: orderId }, data: { status } });
}

export async function reserveStock(
  tx: Prisma.TransactionClient,
  input: {
    productId: string;
    quantity: number;
    orderId: string;
    fulfillmentId: string;
    createdById?: string | null;
  }
) {
  const qty = input.quantity;
  const updated = await tx.$executeRaw`
    UPDATE "Product"
    SET
      stock = stock - ${qty},
      status = CASE WHEN (stock - ${qty}) <= 0 THEN 'OUT_OF_STOCK'::"ProductStatus" ELSE status END,
      "updatedAt" = NOW()
    WHERE id = ${input.productId}
      AND stock >= ${qty}
      AND status IN ('ACTIVE'::"ProductStatus", 'OUT_OF_STOCK'::"ProductStatus")
  `;
  if (updated !== 1) {
    throw new OutOfStockError();
  }
  const product = await tx.product.findUniqueOrThrow({
    where: { id: input.productId },
    select: { stock: true },
  });
  await tx.inventoryMovement.create({
    data: {
      productId: input.productId,
      orderId: input.orderId,
      fulfillmentId: input.fulfillmentId,
      type: "RESERVE",
      quantity: -qty,
      balanceAfter: product.stock,
      reason: "Order reservation",
      createdById: input.createdById ?? null,
    },
  });
  return product.stock;
}

export async function releaseStock(
  tx: Prisma.TransactionClient,
  input: {
    productId: string;
    quantity: number;
    orderId?: string | null;
    fulfillmentId?: string | null;
    createdById?: string | null;
    reason: string;
  }
) {
  const qty = input.quantity;
  const updated = await tx.$executeRaw`
    UPDATE "Product"
    SET
      stock = stock + ${qty},
      status = CASE
        WHEN (stock + ${qty}) > 0 AND status = 'OUT_OF_STOCK'::"ProductStatus" THEN 'ACTIVE'::"ProductStatus"
        ELSE status
      END,
      "updatedAt" = NOW()
    WHERE id = ${input.productId}
  `;
  if (updated !== 1) {
    throw new Error("Failed to release stock");
  }
  const product = await tx.product.findUniqueOrThrow({
    where: { id: input.productId },
    select: { stock: true },
  });
  await tx.inventoryMovement.create({
    data: {
      productId: input.productId,
      orderId: input.orderId ?? null,
      fulfillmentId: input.fulfillmentId ?? null,
      type: "RELEASE",
      quantity: qty,
      balanceAfter: product.stock,
      reason: input.reason,
      createdById: input.createdById ?? null,
    },
  });
  return product.stock;
}

export async function adjustStock(
  tx: Prisma.TransactionClient,
  input: {
    productId: string;
    stock: number;
    createdById?: string | null;
    reason?: string;
  }
) {
  const next = Math.max(0, Math.floor(input.stock));
  const current = await tx.product.findUniqueOrThrow({
    where: { id: input.productId },
    select: { stock: true, status: true },
  });
  const delta = next - current.stock;
  const frozen = current.status === "DRAFT" || current.status === "ARCHIVED";
  const status = frozen
    ? current.status
    : next <= 0
      ? "OUT_OF_STOCK"
      : current.status === "OUT_OF_STOCK"
        ? "ACTIVE"
        : current.status;
  const product = await tx.product.update({
    where: { id: input.productId },
    data: { stock: next, status },
    select: { stock: true, status: true },
  });
  await tx.inventoryMovement.create({
    data: {
      productId: input.productId,
      type: "ADJUST",
      quantity: delta,
      balanceAfter: product.stock,
      reason: input.reason || "Manual stock adjustment",
      createdById: input.createdById ?? null,
    },
  });
  return product;
}

async function releaseFulfillmentItems(
  tx: Prisma.TransactionClient,
  fulfillment: { id: string; status: FulfillmentStatus; items: { productId: string; quantity: number }[] },
  input: { orderId: string; createdById?: string | null; reason: string }
) {
  if (fulfillment.status === "CANCELLED" || fulfillment.status === "SHIPPED" || fulfillment.status === "DELIVERED") {
    return fulfillment.status === "CANCELLED";
  }
  for (const item of fulfillment.items) {
    await releaseStock(tx, {
      productId: item.productId,
      quantity: item.quantity,
      orderId: input.orderId,
      fulfillmentId: fulfillment.id,
      createdById: input.createdById,
      reason: input.reason,
    });
  }
  await tx.orderFulfillment.update({
    where: { id: fulfillment.id },
    data: { status: "CANCELLED" },
  });
  return true;
}

export async function cancelOrderInTransaction(
  tx: Prisma.TransactionClient,
  orderId: string,
  input: { createdById?: string | null; reason?: string }
) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { fulfillments: { include: { items: true } } },
  });
  if (!order) return { ok: false as const, error: "Order not found", status: 404 };
  if (order.cancelledAt && order.fulfillments.every((f) => f.status === "CANCELLED")) {
    return { ok: false as const, error: "This order is already cancelled", status: 409 };
  }

  const reason = input.reason || "Order cancelled";
  let released = 0;
  let skippedShipped = 0;
  for (const fulfillment of order.fulfillments) {
    if (fulfillment.status === "SHIPPED" || fulfillment.status === "DELIVERED") {
      skippedShipped += 1;
      continue;
    }
    const did = await releaseFulfillmentItems(tx, fulfillment, {
      orderId: order.id,
      createdById: input.createdById,
      reason,
    });
    if (did) released += 1;
  }

  const fulfillments = await tx.orderFulfillment.findMany({
    where: { orderId: order.id },
    select: { status: true },
  });
  const allCancelled = fulfillments.length > 0 && fulfillments.every((f) => f.status === "CANCELLED");
  const data: Prisma.OrderUpdateInput = {
    cancelReason: reason,
  };
  if (allCancelled) {
    data.cancelledAt = new Date();
    data.status = "CANCELLED";
  } else {
    data.status = rollupOrderStatus(order.paymentStatus, fulfillments, null);
  }
  const updated = await tx.order.update({ where: { id: order.id }, data });
  return { ok: true as const, order: updated, released, skippedShipped };
}

export async function expireUnpaidOrders(db: Db = prisma) {
  const cutoff = new Date(Date.now() - UNPAID_EXPIRY_MS);
  const expired = await db.order.findMany({
    where: {
      paymentStatus: "PENDING",
      cancelledAt: null,
      createdAt: { lt: cutoff },
      status: { in: ["PENDING_PAYMENT", "PENDING"] },
    },
    select: { id: true },
  });

  const expiredIds: string[] = [];
  for (const row of expired) {
    try {
      await prisma.$transaction(async (tx) => {
        const fresh = await tx.order.findUnique({ where: { id: row.id } });
        if (!fresh || fresh.paymentStatus !== "PENDING" || fresh.cancelledAt) return;
        if (fresh.createdAt >= new Date(Date.now() - UNPAID_EXPIRY_MS)) return;
        const result = await cancelOrderInTransaction(tx, fresh.id, {
          reason: "Unpaid order expired after 24 hours",
        });
        if (result.ok) expiredIds.push(fresh.id);
      });
    } catch (error) {
      console.error("Failed to expire unpaid order", row.id, error);
    }
  }
  return { expired: expiredIds.length, orderIds: expiredIds };
}

export async function expireUnpaidOrdersSafe() {
  // Skip during `next build` prerender — Date.now() is not allowed in that phase.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return { expired: 0, orderIds: [] as string[] };
  }
  try {
    return await expireUnpaidOrders();
  } catch (error) {
    console.error("expireUnpaidOrders failed", error);
    return { expired: 0, orderIds: [] as string[] };
  }
}
