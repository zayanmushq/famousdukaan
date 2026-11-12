"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";

export default function Header() {
  const [search, setSearch] = useState("");
  const [dark, setDark] = useState(false);
  const { data: session, status } = useSession();
  const role = session?.user?.role;

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-xl border-b border-neutral-100 dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="text-lg font-medium tracking-tight text-neutral-900 dark:text-neutral-100">
          FamousDukaan
        </Link>

        <div className="hidden md:flex flex-1 max-w-sm mx-12">
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 text-sm bg-neutral-50 dark:bg-neutral-900 rounded-full border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500 transition-colors text-neutral-900 dark:text-neutral-100"
          />
        </div>

        <nav className="flex items-center gap-6 text-sm text-neutral-600 dark:text-neutral-400">
          <Link href="/products" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
            Shop
          </Link>
          <Link href="/plans" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
            Plans
          </Link>
          {session && (
            <>
              <Link href="/wishlist" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                Wishlist
              </Link>
              <Link href="/orders" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                Orders
              </Link>
              <Link href="/account" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                Account
              </Link>
            </>
          )}
          <Link href="/cart" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
            Cart
          </Link>
          {(role === "VENDOR" || role === "ADMIN") && (
            <Link href="/dashboard" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
              Dashboard
            </Link>
          )}
          <button
            onClick={() => setDark(!dark)}
            className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Toggle dark mode"
          >
            {dark ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          {status !== "loading" && !session && (
            <Link href="/login" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
              Login
            </Link>
          )}
          {session && (
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            >
              Logout
            </button>
          )}
          {role === "ADMIN" && (
            <Link
              href="/admin"
              className="px-4 py-1.5 text-xs font-medium text-neutral-900 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-600 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              Admin
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}