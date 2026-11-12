import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getAuthSession } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { maskAccountNumber } from "@/lib/vendor-crypto";
import SellClient, { type SellApplication } from "./SellClient";

export const metadata: Metadata = {
  title: "Sell on FamousDukaan",
  description: "Apply to open a shop on FamousDukaan. Applications are reviewed before a shop goes live.",
};

export default function SellPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-6 py-16 text-neutral-500">Loading application...</div>}>
      <SellLoader />
    </Suspense>
  );
}

async function SellLoader() {
  await connection();
  const session = await getAuthSession();
  let application: SellApplication | null = null;
  if (session?.user?.id) {
    const vendor = await prisma.vendor.findUnique({ where: { userId: session.user.id } });
    if (vendor) {
      application = {
        storeName: vendor.storeName,
        slug: vendor.slug,
        description: vendor.description || "",
        contactPhone: vendor.contactPhone || "",
        pickupCity: vendor.pickupCity || "",
        pickupState: vendor.pickupState || "",
        pickupPincode: vendor.pickupPincode || "",
        pan: vendor.pan || "",
        gstin: vendor.gstin || "",
        bankAccountHolder: vendor.bankAccountHolder || "",
        bankIfsc: vendor.bankIfsc || "",
        bankAccountMasked: maskAccountNumber(vendor.bankAccountLast4),
        status: vendor.status,
        statusReason: vendor.statusReason,
      };
    }
  }
  return (
    <SellClient
      signedIn={Boolean(session?.user?.id)}
      userName={session?.user?.name || ""}
      userEmail={session?.user?.email || ""}
      application={application}
    />
  );
}
