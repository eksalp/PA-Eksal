"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      router.push("/");
      router.refresh();
      return;
    }

    // mode === "signup"
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    // Kalau "Confirm email" masih aktif di Supabase, signUp berhasil tapi
    // session-nya null — user harus klik link di email dulu.
    if (!data.session) {
      setInfo("Akun dibuat. Cek email kamu untuk konfirmasi, lalu login.");
      setMode("signin");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="glass-card w-full max-w-sm p-6">
        <h1 className="text-xl font-semibold">
          {mode === "signin" ? "Masuk" : "Daftar"}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {mode === "signin"
            ? "Masuk untuk lihat dashboard kamu."
            : "Buat akun untuk mulai pakai AI Life OS."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-neutral-500">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white/60 px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-white/10 dark:bg-white/5"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-neutral-500">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white/60 px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-white/10 dark:bg-white/5"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {info && <p className="text-sm text-emerald-600">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            {loading ? "Sebentar…" : mode === "signin" ? "Masuk" : "Daftar"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setInfo(null);
          }}
          className="mt-4 w-full text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
        >
          {mode === "signin" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
        </button>
      </div>
    </div>
  );
}
