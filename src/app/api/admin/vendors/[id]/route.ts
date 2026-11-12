import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { adminVendorInclude, serializeAdminVendor } from "../route";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireApiRole(["ADMIN"]);
  if (error || !session) return error;
  const { id } = await context.params;

  let body: Record<string, unknown>;
  try {
    const raw = await request.json();
    body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action || "").toLowerCase();
  const reason = String(body.reason || "").trim();
  if (!["approve", "reject", "suspend"].includes(action)) {
    return NextResponse.json({ error: "action must be approve, reject, or suspend" }, { status: 400 });
  }
  if ((action === "reject" || action === "suspend") && reason.length < 3) {
    return NextResponse.json({ error: "A reason is required" }, { status: 400 });
  }

  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const status = action === "approve" ? "APPROVED" : action === "reject" ? "REJECTED" : "SUSPENDED";
  const nextRole = action === "approve" ? "VENDOR" : "CUSTOMER";

  const updated = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: vendor.userId },
      data: { role: nextRole },
    });
    return tx.vendor.update({
      where: { id },
      data: {
        status,
        statusReason: action === "approve" ? null : reason,
        reviewedAt: new Date(),
        reviewedById: session.user.id,
      },
      include: adminVendorInclude,
    });
  });

  return NextResponse.json({ success: true, vendor: serializeAdminVendor(updated) });
}
