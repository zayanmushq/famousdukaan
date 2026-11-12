"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sell, setSell] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setPending(true);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, sell, storeName: storeName || name }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setPending(false);
      setError(data.error || "Unable to create account.");
      return;
    }
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: sell ? "/sell" : "/account",
    });
    setPending(false);
    if (result?.error) {
      setError("Account created, but sign-in failed. Please log in.");
      return;
    }
    router.push(sell ? "/sell" : "/account");
    router.refresh();
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
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm"
          required
          minLength={8}
        />
        <label className="flex items-start gap-3 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={sell}
            onChange={(e) => setSell(e.target.checked)}
            className="mt-1"
          />
          <span>I want to sell — I will complete a seller application after signing up</span>
        </label>
        {sell && (
          <input
            type="text"
            placeholder="Store name"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm"
          />
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={pending} className="w-full py-3 bg-neutral-900 text-white text-sm rounded-full disabled:opacity-60">
          {pending ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-neutral-500 text-center">
        Already have an account? <a href="/login" className="underline">Login</a>
      </p>
    </div>
  );
}
