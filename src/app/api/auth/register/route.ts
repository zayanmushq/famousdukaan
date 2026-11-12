import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/request-ip";

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "store";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = normalizeEmail(String(body.email || ""));
    const password = String(body.password || "");
    const sell = Boolean(body.sell);
    const storeName = String(body.storeName || name || "My Store").trim();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: sell ? "VENDOR" : "CUSTOMER",
        },
      });

      if (sell) {
        let slug = slugify(storeName);
        const clash = await tx.vendor.findUnique({ where: { slug } });
        if (clash) slug = `${slug}-${created.id.slice(-6).toLowerCase()}`;
        await tx.vendor.create({
          data: {
            userId: created.id,
            storeName,
            slug,
            status: "PENDING",
          },
        });
      }

      return created;
    });

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch {
    return NextResponse.json({ error: "Unable to create account." }, { status: 500 });
  }
}
