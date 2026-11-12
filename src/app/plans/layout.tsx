import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vendor Plans",
  description: "Start selling in minutes. Upgrade anytime.",
  alternates: { canonical: "/plans" },
};

export default function PlansLayout({ children }: { children: React.ReactNode }) {
  return children;
}
