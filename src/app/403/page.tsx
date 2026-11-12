import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="max-w-lg mx-auto px-6 py-24 text-center">
      <h1 className="text-3xl font-light tracking-tight mb-3">Access denied</h1>
      <p className="text-neutral-500 mb-8">
        You don't have permission to view this page.
      </p>
      <div className="flex justify-center gap-4 text-sm">
        <Link href="/" className="underline">Go home</Link>
        <Link href="/account" className="underline">My account</Link>
      </div>
    </div>
  );
}
