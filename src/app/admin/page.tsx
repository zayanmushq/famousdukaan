import { Suspense } from "react";
import { requireRole } from "@/lib/auth-guard";
import AdminClient from "./AdminClient";

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-6 py-16 text-neutral-500">Loading admin...</div>}>
      <AdminLoader />
    </Suspense>
  );
}

async function AdminLoader() {
  await requireRole(["ADMIN"], "/admin");
  return <AdminClient />;
}
