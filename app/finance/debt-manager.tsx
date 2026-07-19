"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Debt = {
  id: string;
  direction: string; // utang | piutang
  counterparty_name: string;
  remaining_amount: number;
  due_date: string | null;
  status: string;
};

const idr = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

export function DebtManager({
  userId,
  debts,
}: {
  userId: string;
  debts: Debt[];
}) {
  const [direction, setDirection] = useState("utang");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);

  const router = useRouter();
  const supabase = createClient() as any;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !amount) return;
    setBusy(true);
    const { error } = await supabase.from("debts").insert({
      user_id: userId,
      direction,
      counterparty_name: name.trim(),
      original_amount: Number(amount),
      remaining_amount: Number(amount),
      due_date: due || null,
      status: "active",
    });
    setBusy(false);
    if (error) return alert("Gagal: " + error.message);
    setName("");
    setAmount("");
    setDue("");
    router.refresh();
  }

  async function markPaid(d: Debt) {
    if (!confirm(`Tandai lunas: ${d.counterparty_name}?`)) return;
    const { error } = await supabase
      .from("debts")
      .update({ status: "paid", remaining_amount: 0 })
      .eq("id", d.id);
    if (error) return alert("Gagal: " + error.message);
    router.refresh();
  }

  const inputCls =
    "rounded-lg border border-neutral-200 bg-white/60 px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-white/10 dark:bg-white/5";

  return (
    <div className="glass-card p-6">
      <h2 className="mb-3 text-sm font-medium text-neutral-500">
        Utang & Piutang aktif
      </h2>

      <ul className="mb-4 space-y-2">
        {debts.map((d) => (
          <li key={d.id} className="flex items-center justify-between text-sm">
            <span>
              {d.direction === "utang" ? "Utang ke" : "Piutang dari"}{" "}
              {d.counterparty_name}
              {d.due_date && (
                <span className="text-xs text-neutral-400">
                  {" "}
                  · tempo {d.due_date}
                </span>
              )}
            </span>
            <span className="flex items-center gap-3">
              <span
                className={
                  d.direction === "utang" ? "text-red-500" : "text-green-600"
                }
              >
                {idr(Number(d.remaining_amount))}
              </span>
              <button
                onClick={() => markPaid(d)}
                className="text-xs text-neutral-400 hover:text-emerald-600"
              >
                lunas
              </button>
            </span>
          </li>
        ))}
        {debts.length === 0 && (
          <p className="text-sm text-neutral-400">
            Tidak ada utang/piutang aktif.
          </p>
        )}
      </ul>

      <form onSubmit={add} className="flex flex-wrap gap-2">
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          className={inputCls}
        >
          <option value="utang">Utang (aku pinjam)</option>
          <option value="piutang">Piutang (aku pinjamkan)</option>
        </select>
        <input
          placeholder="Nama pihak"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`flex-1 ${inputCls}`}
        />
        <input
          type="number"
          placeholder="Jumlah"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={`w-28 ${inputCls}`}
        />
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className={inputCls}
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
