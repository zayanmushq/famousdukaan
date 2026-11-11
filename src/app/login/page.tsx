"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Demo login - stores user in localStorage
    if (email && password) {
      localStorage.setItem("user", JSON.stringify({ email, name: email.split("@")[0] }));
      router.push("/account");
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-20">
      <h1 className="text-3xl font-light tracking-tight mb-2">Login</h1>
      <p className="text-neutral-500 mb-8">Welcome back to FamousDukaan</p>

      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm"
          required
        />
        <button type="submit" className="w-full py-3 bg-neutral-900 text-white text-sm rounded-full">
          Login
        </button>
      </form>

      <p className="mt-6 text-sm text-neutral-500 text-center">
        Don't have an account? <a href="/register" className="underline">Sign up</a>
      </p>
    </div>
  );
}