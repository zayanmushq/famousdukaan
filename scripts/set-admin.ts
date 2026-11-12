import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("Missing required environment variables.");
    process.exit(1);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("Admin email is not valid.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password does not meet the minimum length.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const prisma = new PrismaClient();
  try {
    await prisma.user.upsert({
      where: { email },
      update: { role: "ADMIN", passwordHash },
      create: { email, name: "Admin", role: "ADMIN", passwordHash },
    });
    console.log("Admin user upserted.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Failed to upsert admin user.");
  process.exit(1);
});
