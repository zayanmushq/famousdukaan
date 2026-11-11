"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AccountPage() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("user");
    if (saved) {
      setUser(JSON.parse(saved));
    } else {
      router.push("/login");
    }
  }, [router]);

  const logout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-light tracking-tight mb-2">My Account</h1>
      <p className="text-neutral-500 mb-10">Welcome, {user.name}</p>

      <div className="border border-neutral-200 rounded-2xl p-6 space-y-4">
        <div>
          <div className="text-sm text-neutral-500">Name</div>
          <div className="font-medium">{user.name}</div>
        </div>
        <div>
          <div className="text-sm text-neutral-500">Email</div>
          <div className="font-medium">{user.email}</div>
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

      <button onClick={logout} className="mt-8 text-sm text-red-600 underline">
        Logout
      </button>
    </div>
  );
}