import { Suspense } from "react";
import { requireAuth } from "@/lib/auth-guard";
import AccountClient from "./AccountClient";

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-6 py-16 text-neutral-500">Loading account...</div>}>
      <AccountLoader />
    </Suspense>
  );
}

async function AccountLoader() {
  const session = await requireAuth("/account");
  return (
    <AccountClient
      name={session.user.name || ""}
      email={session.user.email || ""}
      role={session.user.role}
    />
  );
}
