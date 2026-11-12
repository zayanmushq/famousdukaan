import type { Role, VendorStatus } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: Role;
      vendorId: string | null;
      vendorStatus: VendorStatus | null;
    };
  }

  interface User {
    id: string;
    role: Role;
    vendorId: string | null;
    vendorStatus: VendorStatus | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    vendorId: string | null;
    vendorStatus: VendorStatus | null;
  }
}

export {};
