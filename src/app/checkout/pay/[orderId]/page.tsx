import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { buildUpiUri } from "@/lib/upi";
import PayClient from "./PayClient";

export default function PayPage({ params }: { params: Promise<{ orderId: string }> }) {
  return (
    <Suspense fallback={<div className="max-w-xl mx-auto px-6 py-16 text-neutral-500">Loading payment...</div>}>
      <PayLoader params={params} />
    </Suspense>
  );
}

async function PayLoader({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const session = await requireAuth(`/checkout/pay/${orderId}`);
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) notFound();
  if (session.user.role !== "ADMIN" && session.user.id !== order.userId) {
    redirect("/403");
  }

  const upiUri = buildUpiUri(order.total, order.orderNo);
  const qrDataUrl = await QRCode.toDataURL(upiUri, { width: 320, margin: 1, errorCorrectionLevel: "M" });

  return (
    <PayClient
      orderId={order.id}
      orderNo={order.orderNo}
      total={order.total}
      paymentStatus={order.paymentStatus}
      upiUri={upiUri}
      qrDataUrl={qrDataUrl}
      upiTxnRef={order.upiTxnRef}
    />
  );
}
