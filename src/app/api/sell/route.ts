import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAuthSession } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/request-ip";
import { encryptAccountNumber, maskAccountNumber } from "@/lib/vendor-crypto";
import { parseVendorApply } from "@/lib/vendor-validation";

function publicVendor(vendor: {
  id: string;
  storeName: string;
  slug: string;
  description: string | null;
  contactPhone: string | null;
  pickupCity: string | null;
  pickupState: string | null;
  pickupPincode: string | null;
  pan: string | null;
  gstin: string | null;
  bankAccountHolder: string | null;
  bankIfsc: string | null;
  bankAccountLast4: string | null;
  status: string;
  statusReason: string | null;
  reviewedAt: Date | null;
}) {
  return {
    id: vendor.id,
    storeName: vendor.storeName,
    slug: vendor.slug,
    description: vendor.description,
    contactPhone: vendor.contactPhone,
    pickupCity: vendor.pickupCity,
    pickupState: vendor.pickupState,
    pickupPincode: vendor.pickupPincode,
    pan: vendor.pan,
    gstin: vendor.gstin,
    bankAccountHolder: vendor.bankAccountHolder,
    bankIfsc: vendor.bankIfsc,
    bankAccountMasked: maskAccountNumber(vendor.bankAccountLast4),
    status: vendor.status,
    statusReason: vendor.statusReason,
    reviewedAt: vendor.reviewedAt,
  };
}

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ application: null });
  }
  const vendor = await prisma.vendor.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json({ application: vendor ? publicVendor(vendor) : null });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const raw = await request.json();
    body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseVendorApply(body);
  if (parsed.error || !parsed.data) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const data = parsed.data;

  const session = await getAuthSession();
  let userId = session?.user?.id ?? null;

  if (!userId) {
    const name = String(body.name || data.storeName).trim();
    const email = normalizeEmail(String(body.email || ""));
    const password = String(body.password || "");
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required to apply as a new user" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists. Log in, then apply." }, { status: 409 });
    }
    const created = await prisma.user.create({
      data: { name, email, passwordHash: await bcrypt.hash(password, 12), role: "CUSTOMER" },
    });
    userId = created.id;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { vendor: true },
  });
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (user.role === "ADMIN") {
    return NextResponse.json({ error: "Admin accounts cannot apply as vendors" }, { status: 403 });
  }

  const existing = user.vendor;
  if (existing?.status === "APPROVED") {
    return NextResponse.json({ error: "This account already has an approved shop" }, { status: 409 });
  }
  if (existing?.status === "SUSPENDED") {
    return NextResponse.json({ error: "This shop is suspended and cannot re-apply" }, { status: 403 });
  }
  if (existing?.status === "PENDING") {
    return NextResponse.json({ error: "An application is already pending review" }, { status: 409 });
  }

  const slugClash = await prisma.vendor.findUnique({ where: { slug: data.slug } });
  if (slugClash && slugClash.userId !== userId) {
    return NextResponse.json({ error: "That shop slug is already taken" }, { status: 409 });
  }

  let encrypted: { cipher: string; last4: string };
  try {
    encrypted = encryptAccountNumber(data.bankAccountNumber);
  } catch {
    return NextResponse.json({ error: "Could not store bank details securely. Try again later." }, { status: 500 });
  }

  const vendorData = {
    storeName: data.storeName,
    slug: data.slug,
    description: data.description,
    contactPhone: data.contactPhone,
    pickupCity: data.pickupCity,
    pickupState: data.pickupState,
    pickupPincode: data.pickupPincode,
    pan: data.pan,
    gstin: data.gstin,
    bankAccountHolder: data.bankAccountHolder,
    bankIfsc: data.bankIfsc,
    bankAccountLast4: encrypted.last4,
    bankAccountCipher: encrypted.cipher,
    status: "PENDING" as const,
    statusReason: null,
    reviewedAt: null,
    reviewedById: null,
  };

  const vendor = existing
    ? await prisma.vendor.update({ where: { id: existing.id }, data: vendorData })
    : await prisma.vendor.create({ data: { ...vendorData, userId } });

  return NextResponse.json({
    success: true,
    createdAccount: !session?.user?.id,
    application: publicVendor(vendor),
  }, { status: existing ? 200 : 201 });
}
