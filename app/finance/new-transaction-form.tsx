"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database, TransactionType } from "@/types/database";

type Account = Database["public"]["Tables"]["accounts"]["Row"];

export function NewTransactionForm({ userId, accounts }: { userId: string; accounts: Account[] }) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;
    setLoading(true);

    await supabase.from("transactions").insert({
      user_id: userId,
      account_id: accountId || null,
      type,
      amount: Number(amount),
      note: note || null,
    });

    setAmount("");
    setNote("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card flex flex-wrap gap-2 p-4">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as TransactionType)}
        className="rounded-lg border border-neutral-200 bg-white/60 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
      >
        <option value="expense">Pengeluaran</option>
        <option value="income">Pemasukan</option>
      </select>
      <select
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
        className="rounded-lg border border-neutral-200 bg-white/60 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
      >
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      <input
        type="number"
        placeholder="Jumlah"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-32 rounded-lg border border-neutral-200 bg-white/60 px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-white/5"
      />
      <input
        type="text"
        placeholder="Catatan (opsional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="flex-1 rounded-lg border border-neutral-200 bg-white/60 px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-white/5"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
      >
        Tambah
      </button>
    </form>
  );
}
