"use client";

import { signOut } from "next-auth/react";
import type { Role } from "@prisma/client";

export default function AccountClient({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: Role;
}) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-light tracking-tight mb-2">My Account</h1>
      <p className="text-neutral-500 mb-10">Welcome, {name || "there"}</p>

      <div className="border border-neutral-200 rounded-2xl p-6 space-y-4">
        <div>
          <div className="text-sm text-neutral-500">Name</div>
          <div className="font-medium">{name || "—"}</div>
        </div>
        <div>
          <div className="text-sm text-neutral-500">Email</div>
          <div className="font-medium">{email}</div>
        </div>
        <div>
          <div className="text-sm text-neutral-500">Role</div>
          <div className="font-medium capitalize">{role.toLowerCase()}</div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <a href="/orders" className="p-4 border border-neutral-200 rounded-xl text-center text-sm hover:bg-neutral-50">
          My Orders
        </a>
        <a href="/wishlist" className="p-4 border border-neutral-200 rounded-xl text-center text-sm hover:bg-neutral-50">
          Wishlist
        </a>
      </div>

      <button onClick={() => signOut({ callbackUrl: "/" })} className="mt-8 text-sm text-red-600 underline">
        Logout
      </button>
    </div>
  );
}
