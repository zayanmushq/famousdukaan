import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { computeOrderTotal, generateOrderNo, parseCartItems, parseShippingAddress } from "@/lib/order";
import { expireUnpaidOrdersSafe, OutOfStockError, reserveStock } from "@/lib/inventory";

export async function GET() {
  const { session, error } = await requireApiSession();
  if (error || !session) return error;

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: {
      items: { include: { product: { select: { id: true, name: true, images: true } } } },
      fulfillments: {
        include: {
          vendor: { select: { id: true, storeName: true } },
          items: { include: { product: { select: { id: true, name: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  const { session, error } = await requireApiSession();
  if (error || !session) return error;

  await expireUnpaidOrdersSafe();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const items = parseCartItems(payload.items);
  const shippingAddress = parseShippingAddress(payload.shippingAddress);
  if (!items) {
    return NextResponse.json({ error: "Provide a valid items list" }, { status: 400 });
  }
  if (!shippingAddress) {
    return NextResponse.json({ error: "Provide a valid shipping address" }, { status: 400 });
  }

  const productIds = [...new Set(items.map((item) => item.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, status: { in: ["ACTIVE", "OUT_OF_STOCK"] } },
    select: { id: true, price: true, vendorId: true, name: true, stock: true },
  });
  if (products.length !== productIds.length) {
    return NextResponse.json({ error: "One or more products are unavailable" }, { status: 400 });
  }

  const productMap = new Map(products.map((product) => [product.id, product]));
  const lines = items.map((item) => {
    const product = productMap.get(item.productId)!;
    return {
      productId: product.id,
      quantity: item.quantity,
      price: product.price,
      vendorId: product.vendorId,
    };
  });
  const total = computeOrderTotal(lines);
  const vendorIds = new Set(lines.map((line) => line.vendorId));
  const vendorId = vendorIds.size === 1 ? lines[0].vendorId : null;

  try {
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNo: generateOrderNo(),
          userId: session.user.id,
          vendorId,
          total,
          status: "PENDING_PAYMENT",
          paymentMethod: "UPI",
          paymentStatus: "PENDING",
          shippingAddress,
        },
      });

      const fulfillmentIds = new Map<string, string>();
      for (const lineVendorId of vendorIds) {
        const fulfillment = await tx.orderFulfillment.create({
          data: {
            orderId: created.id,
            vendorId: lineVendorId,
            status: "AWAITING_PAYMENT",
          },
        });
        fulfillmentIds.set(lineVendorId, fulfillment.id);
      }

      const createdItems = [];
      for (const line of lines) {
        const fulfillmentId = fulfillmentIds.get(line.vendorId)!;
        const item = await tx.orderItem.create({
          data: {
            orderId: created.id,
            fulfillmentId,
            productId: line.productId,
            quantity: line.quantity,
            price: line.price,
          },
        });
        createdItems.push(item);
        await reserveStock(tx, {
          productId: line.productId,
          quantity: line.quantity,
          orderId: created.id,
          fulfillmentId,
          createdById: session.user.id,
        });
      }

      return { ...created, items: createdItems };
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNo: order.orderNo,
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        items: order.items,
      },
    });
  } catch (err) {
    if (err instanceof OutOfStockError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
