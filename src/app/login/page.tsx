"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/account";

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setPending(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });
    setPending(false);
    if (result?.error) {
      setError(result.error === "TOO_MANY_ATTEMPTS"
        ? "Too many attempts. Please try again in 15 minutes."
        : "Invalid email or password.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={pending} className="w-full py-3 bg-neutral-900 text-white text-sm rounded-full disabled:opacity-60">
          {pending ? "Signing in..." : "Login"}
        </button>
      </form>

      <p className="mt-6 text-sm text-neutral-500 text-center">
        Don't have an account? <a href="/register" className="underline">Sign up</a>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto px-6 py-20 text-neutral-500">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
