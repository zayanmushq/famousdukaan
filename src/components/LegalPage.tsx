import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_DRAFT_NOTICE, LEGAL_PAGES, legalDisclaimer } from "@/lib/legal";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export function legalMetadata(title: string, description: string, path: string): Metadata {
  const url = `${SITE_URL}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "en_IN",
      type: "website",
    },
  };
}

export default function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <p className="inline-block text-xs font-medium tracking-wide uppercase bg-amber-100 text-amber-900 px-3 py-1 rounded-full mb-6">
        {LEGAL_DRAFT_NOTICE}
      </p>
      <h1 className="text-3xl font-light tracking-tight">{title}</h1>
      <div className="mt-8 space-y-4 text-neutral-700 dark:text-neutral-300 leading-relaxed text-sm md:text-base">
        {children}
      </div>
      <p className="mt-8 text-sm text-neutral-500">{legalDisclaimer()}</p>
      <nav className="mt-12 pt-6 border-t border-neutral-100 text-sm text-neutral-500">
        <div className="font-medium text-neutral-800 dark:text-neutral-200 mb-3">Legal and contact</div>
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {LEGAL_PAGES.map((page) => (
            <li key={page.href}>
              <Link href={page.href} className="underline hover:text-neutral-900">
                {page.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
