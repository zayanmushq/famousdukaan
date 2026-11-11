"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email && password) {
      localStorage.setItem("user", JSON.stringify({ name, email }));
      router.push("/account");
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-20">
      <h1 className="text-3xl font-light tracking-tight mb-2">Create Account</h1>
      <p className="text-neutral-500 mb-8">Join FamousDukaan</p>

      <form onSubmit={handleRegister} className="space-y-4">
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm"
          required
        />
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
          Create Account
        </button>
      </form>

      <p className="mt-6 text-sm text-neutral-500 text-center">
        Already have an account? <a href="/login" className="underline">Login</a>
      </p>
    </div>
  );
}