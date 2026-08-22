"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();
  const router = useRouter();

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{
              background: "linear-gradient(135deg,#4F78FF,#7C5CFC)",
              boxShadow: "0 8px 24px rgba(79,120,255,.35)",
            }}
          >
            <span className="text-2xl font-bold text-white">A</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            AI Life OS
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-3)" }}>
            Selamat datang kembali
          </p>
        </div>

        <form onSubmit={login} className="card space-y-4 p-6">
          <div>
            <label
              className="mb-1.5 block text-xs font-semibold"
              style={{ color: "var(--text-2)" }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kamu@email.com"
              required
              className="input"
            />
          </div>
          <div>
            <label
              className="mb-1.5 block text-xs font-semibold"
              style={{ color: "var(--text-2)" }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="input"
            />
          </div>
          {error && (
            <p
              className="rounded-xl p-3 text-sm"
              style={{ background: "var(--red-bg)", color: "var(--red)" }}
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "Masuk…" : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
