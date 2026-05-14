"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import SiteBrandName from "@/app/components/SiteBrandName";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    router.push("/admin/dashboard");
  }

  return (
    <section className="admin-shell flex min-h-screen items-center justify-center bg-sky-950 px-6 py-16">
      <div className="w-full max-w-md rounded border border-sky-800 bg-white p-8 shadow-xl">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-yellow-600">
          <SiteBrandName
            firstClassName="text-yellow-600"
            restClassName="text-sky-950"
          />
        </p>
        <h1 className="mt-4 text-3xl font-bold text-sky-950">
          Sign in to Dashboard
        </h1>
        <p className="mt-3 leading-7 text-slate-600">
          Use your Supabase admin account to access the protected school admin
          area.
        </p>

        {errorMessage && (
          <p className="mt-5 rounded border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
            {errorMessage}
          </p>
        )}

        <form onSubmit={handleLogin} className="mt-6 grid gap-4">
          <label className="grid gap-2 font-semibold text-slate-700">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-emerald-500"
              placeholder="admin@example.com"
            />
          </label>

          <label className="grid gap-2 font-semibold text-slate-700">
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-emerald-500"
              placeholder="Enter password"
            />
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="rounded bg-yellow-400 px-6 py-3 font-bold text-sky-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isLoading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </section>
  );
}
