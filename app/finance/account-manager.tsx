"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Account = {
  id: string;
  name: string;
  type: string;
  current_balance: number;
};

const TYPES = ["cash", "bank", "ewallet", "investment", "other"];
const idr = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

export function AccountManager({
  userId,
  accounts,
}: {
  userId: string;
  accounts: Account[];
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState("bank");
  const [balance, setBalance] = useState("");
  const [busy, setBusy] = useState(false);

  const router = useRouter();
  const supabase = createClient() as any;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("accounts").insert({
      user_id: userId,
      name: name.trim(),
      type,
      current_balance: Number(balance) || 0,
    });
    setBusy(false);
    if (error) return alert("Gagal: " + error.message);
    setName("");
    setBalance("");
    router.refresh();
  }

  async function editBalance(a: Account) {
    const val = prompt(`Set saldo "${a.name}":`, String(a.current_balance));
    if (val === null) return;
    const { error } = await supabase
      .from("accounts")
      .update({ current_balance: Number(val) })
      .eq("id", a.id);
    if (error) return alert("Gagal: " + error.message);
    router.refresh();
  }

  async function remove(a: Account) {
    if (!confirm(`Nonaktifkan akun "${a.name}"?`)) return;
    const { error } = await supabase
      .from("accounts")
      .update({ is_active: false })
      .eq("id", a.id);
    if (error) return alert("Gagal: " + error.message);
    router.refresh();
  }

  const inputCls =
    "rounded-lg border border-neutral-200 bg-white/60 px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-white/10 dark:bg-white/5";

  return (
    <div className="glass-card p-6">
      <h2 className="mb-3 text-sm font-medium text-neutral-500">Akun</h2>

      <ul className="mb-4 space-y-2">
        {accounts.map((a) => (
          <li key={a.id} className="flex items-center justify-between text-sm">
            <span>
              {a.name}{" "}
              <span className="text-xs text-neutral-400">({a.type})</span>
            </span>
            <span className="flex items-center gap-3">
              <button
                onClick={() => editBalance(a)}
                className="tabular-nums hover:underline"
              >
                {idr(Number(a.current_balance))}
              </button>
              <button
                onClick={() => remove(a)}
                className="text-xs text-neutral-400 hover:text-red-500"
              >
                hapus
              </button>
            </span>
          </li>
        ))}
        {accounts.length === 0 && (
          <p className="text-sm text-neutral-400">Belum ada akun.</p>
        )}
      </ul>

      <form onSubmit={add} className="flex flex-wrap gap-2">
        <input
          placeholder="Nama akun (BCA, GoPay…)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`flex-1 ${inputCls}`}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={inputCls}
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Saldo awal"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          className={`w-28 ${inputCls}`}
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          +
        </button>
      </form>
    </div>
  );
}
