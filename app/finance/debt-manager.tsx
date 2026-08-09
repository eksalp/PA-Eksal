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
type Account = { id: string; name: string };

const idr = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
const todayWIB = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date(),
  );

export function DebtManager({
  userId,
  debts,
  accounts,
}: {
  userId: string;
  debts: Debt[];
  accounts: Account[];
}) {
  const [direction, setDirection] = useState("utang");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState("");
  const [acc, setAcc] = useState("");
  const [payAcc, setPayAcc] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const router = useRouter();
  const supabase = createClient() as any;

  // transfer "uang keluar/masuk akun". from/to boleh null.
  async function moveCash(
    from: string | null,
    to: string | null,
    amt: number,
    note: string,
  ) {
    await supabase.from("transactions").insert({
      user_id: userId,
      account_id: from,
      transfer_to_account_id: to,
      type: "transfer",
      amount: amt,
      category: "Utang/Piutang",
      note,
      transaction_date: todayWIB(),
    });
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !amount) return;
    setBusy(true);
    const amt = Number(amount);

    const { error } = await supabase.from("debts").insert({
      user_id: userId,
      direction,
      counterparty_name: name.trim(),
      original_amount: amt,
      remaining_amount: amt,
      due_date: due || null,
      status: "active",
    });
    if (error) {
      setBusy(false);
      return alert("Gagal: " + error.message);
    }

    // Gerakkan cash jika akun dipilih:
    if (acc) {
      if (direction === "piutang")
        await moveCash(acc, null, amt, `Pinjamkan ke ${name.trim()}`); // cash keluar
      else await moveCash(null, acc, amt, `Pinjam dari ${name.trim()}`); // cash masuk
    }

    setBusy(false);
    setName("");
    setAmount("");
    setDue("");
    setAcc("");
    router.refresh();
  }

  async function markPaid(d: Debt) {
    const accountId = payAcc[d.id] ?? accounts[0]?.id ?? "";
    const amt = Number(d.remaining_amount);
    const label =
      d.direction === "utang" ? "Bayar utang ke" : "Pelunasan piutang dari";

    if (accountId) {
      if (d.direction === "piutang")
        await moveCash(null, accountId, amt, `${label} ${d.counterparty_name}`); // cash masuk
      else
        await moveCash(accountId, null, amt, `${label} ${d.counterparty_name}`); // cash keluar
    }

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

      <ul className="mb-4 space-y-3">
        {debts.map((d) => (
          <li
            key={d.id}
            className="flex flex-wrap items-center justify-between gap-2 text-sm"
          >
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
            <span className="flex items-center gap-2">
              <span
                className={
                  d.direction === "utang" ? "text-red-500" : "text-green-600"
                }
              >
                {idr(Number(d.remaining_amount))}
              </span>
              {accounts.length > 0 && (
                <select
                  value={payAcc[d.id] ?? accounts[0]?.id}
                  onChange={(e) =>
                    setPayAcc((p) => ({ ...p, [d.id]: e.target.value }))
                  }
                  className="rounded-lg border border-neutral-200 bg-white/60 px-2 py-1 text-xs dark:border-white/10 dark:bg-white/5"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => markPaid(d)}
                className="rounded-lg bg-emerald-500 px-3 py-1 text-xs text-white"
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

      <form onSubmit={add} className="space-y-2">
        <div className="flex flex-wrap gap-2">
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
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-400">
            {direction === "piutang" ? "Uang keluar dari:" : "Uang masuk ke:"}
          </span>
          <select
            value={acc}
            onChange={(e) => setAcc(e.target.value)}
            className={inputCls}
          >
            <option value="">— tidak ubah saldo</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          >
            {busy ? "…" : "Tambah"}
          </button>
        </div>
      </form>
    </div>
  );
}
