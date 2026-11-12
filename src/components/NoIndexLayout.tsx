import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata;

export default function NoIndexLayout({ children }: { children: React.ReactNode }) {
  return children;
}
