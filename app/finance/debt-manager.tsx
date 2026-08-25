"use client";

import { useState, useRef } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Debt = {
  id: string;
  direction: string; // utang | piutang
  counterparty_name: string;
  original_amount: number;
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
  const [showPaid, setShowPaid] = useState(false);
  const busyRef = useRef(false);

  const router = useRouter();
  const supabase = createClient() as any;

  async function moveCash(
    from: string | null,
    to: string | null,
    amt: number,
    note: string,
  ) {
    const { error } = await supabase.from("transactions").insert({
      user_id: userId,
      account_id: from || null,
      transfer_to_account_id: to || null,
      type: "transfer",
      amount: amt,
      category: "Utang/Piutang",
      note,
      transaction_date: todayWIB(),
    });
    if (error) throw new Error(error.message);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !amount) return;
    setBusy(true);
    const amt = Number(amount);

    const { data: debt, error } = await supabase
      .from("debts")
      .insert({
        user_id: userId,
        direction,
        counterparty_name: name.trim(),
        original_amount: amt,
        remaining_amount: amt,
        due_date: due || null,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      setBusy(false);
      return alert("Gagal: " + error.message);
    }

    // Gerakkan cash HANYA jika akun dipilih
    if (acc) {
      try {
        if (direction === "piutang") {
          // Piutang: kamu pinjamkan uang → saldo keluar dari rekeningmu
          await moveCash(acc, null, amt, `Pinjamkan ke ${name.trim()}`);
        } else {
          // Utang karena pinjam uang tunai → saldo masuk ke rekeningmu
          await moveCash(null, acc, amt, `Pinjam uang dari ${name.trim()}`);
        }
      } catch (err: any) {
        alert("Utang tercatat tapi gagal gerak saldo: " + err.message);
      }
    }
    // Jika acc kosong → utang non-tunai (misal: makan/belanja), tidak ada pergerakan saldo. Benar!

    setBusy(false);
    setName("");
    setAmount("");
    setDue("");
    setAcc("");
    router.refresh();
  }

  async function markPaid(d: Debt) {
    if (busyRef.current) return;
    busyRef.current = true;

    const accountId =
      payAcc[d.id] !== undefined ? payAcc[d.id] : (accounts[0]?.id ?? "");

    const amt = Number(d.remaining_amount);
    if (!amt) {
      busyRef.current = false;
      return alert("Jumlah sudah 0, tidak perlu dilunaskan.");
    }

    // Jika tidak ada akun dipilih, tandai lunas tanpa gerak saldo
    // (untuk utang non-tunai yang tidak pernah gerak saldo di awal)
    setBusy(true);
    try {
      if (accountId) {
        if (d.direction === "utang") {
          // Bayar utang → uang keluar dari rekening kamu
          await moveCash(
            accountId,
            null,
            amt,
            `Bayar utang ke ${d.counterparty_name}`,
          );
        } else {
          // Terima pelunasan piutang → uang masuk ke rekening kamu
          await moveCash(
            null,
            accountId,
            amt,
            `Terima pelunasan dari ${d.counterparty_name}`,
          );
        }
      }

      // Update status: lunas tapi TETAP simpan original_amount dan remaining_amount
      await supabase
        .from("debts")
        .update({ status: "paid", remaining_amount: 0 })
        .eq("id", d.id);

      router.refresh();
    } catch (err: any) {
      alert("Gagal: " + err.message);
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  }

  const inputCls =
    "rounded-lg border border-neutral-200 bg-white/60 px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-white/10 dark:bg-white/5";

  const activeDebts = debts.filter((d) => d.status !== "paid");
  const paidDebts = debts.filter((d) => d.status === "paid");

  return (
    <div className="glass-card p-6">
      {/* List AKTIF */}
      <h2 className="mb-3 text-sm font-medium text-neutral-500">
        Utang & Piutang Aktif
      </h2>
      <ul className="mb-4 space-y-3">
        {activeDebts.map((d) => (
          <li
            key={d.id}
            className="flex flex-wrap items-center justify-between gap-2 text-sm"
          >
            <div>
              <span>
                {d.direction === "utang" ? "Utang ke" : "Piutang dari"}{" "}
                <span className="font-medium">{d.counterparty_name}</span>
              </span>
              {d.due_date && (
                <span className="block text-xs text-neutral-400">
                  Tempo: {d.due_date}
                </span>
              )}
              {d.original_amount !== d.remaining_amount && (
                <span className="block text-xs text-neutral-400">
                  Asli: {idr(Number(d.original_amount))}
                </span>
              )}
            </div>
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
                  <option value="">— tanpa gerak saldo</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => markPaid(d)}
                disabled={busy}
                className="rounded-lg bg-emerald-500 px-3 py-1 text-xs text-white disabled:opacity-50"
              >
                Lunas
              </button>
            </span>
          </li>
        ))}
        {activeDebts.length === 0 && (
          <p className="text-sm text-neutral-400">
            Tidak ada utang/piutang aktif.
          </p>
        )}
      </ul>

      {/* List LUNAS (collapsible) */}
      {paidDebts.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowPaid((v) => !v)}
            className="mb-2 flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600"
          >
            <span>{showPaid ? "▾" : "▸"}</span>
            Riwayat Lunas ({paidDebts.length})
          </button>
          {showPaid && (
            <ul className="space-y-2 rounded-xl bg-neutral-50 p-3 dark:bg-white/5">
              {paidDebts.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-400"
                >
                  <div>
                    <span>
                      {d.direction === "utang" ? "Utang ke" : "Piutang dari"}{" "}
                      <span className="font-medium">{d.counterparty_name}</span>
                    </span>
                    {d.due_date && (
                      <span className="block text-xs">Tempo: {d.due_date}</span>
                    )}
                  </div>
                  <span className="flex items-center gap-2">
                    <span className="line-through">
                      {idr(Number(d.original_amount))}
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      ✓ Lunas
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Form tambah */}
      <form onSubmit={add} className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            className={inputCls}
          >
            <option value="utang">Utang (aku yang pinjam / berhutang)</option>
            <option value="piutang">Piutang (aku yang meminjamkan)</option>
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
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-neutral-400">
              {direction === "piutang"
                ? "Uang keluar dari rekening:"
                : "Uang masuk ke rekening:"}
            </span>
            <span className="text-xs text-neutral-300 dark:text-neutral-500">
              {direction === "utang"
                ? "Biarkan kosong jika utang karena makan/belanja (tidak ada uang masuk)"
                : "Biarkan kosong jika tidak ada uang yang keluar"}
            </span>
          </div>
          <select
            value={acc}
            onChange={(e) => setAcc(e.target.value)}
            className={inputCls}
          >
            <option value="">— tidak ubah saldo (utang non-tunai)</option>
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
