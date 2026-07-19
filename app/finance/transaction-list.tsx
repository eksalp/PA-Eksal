"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Txn = {
  id: string;
  type: string;
  amount: number;
  category: string | null;
  note: string | null;
  transaction_date: string;
};
type BudgetCat = { id: string; name: string; group_type: string };

const idr = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

const EXPENSE_GROUPS = ["expenses", "bills", "subscriptions", "savings"];
const GROUP_LABEL: Record<string, string> = {
  income: "Pemasukan",
  bills: "Tagihan",
  subscriptions: "Langganan",
  expenses: "Pengeluaran",
  savings: "Tabungan & Investasi",
};

export function TransactionList({
  transactions,
  categories,
}: {
  transactions: Txn[];
  categories: BudgetCat[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");

  const router = useRouter();
  const supabase = createClient() as any;

  function startEdit(t: Txn) {
    setEditingId(t.id);
    setAmount(String(t.amount));
    setCategory(t.category || "");
    setNote(t.note || "");
    setDate(t.transaction_date);
  }

  async function saveEdit(t: Txn) {
    const { error } = await supabase
      .from("transactions")
      .update({
        amount: Number(amount),
        category: t.type === "transfer" ? null : category || null,
        note: note || null,
        transaction_date: date,
      })
      .eq("id", t.id);
    if (error) return alert("Gagal simpan: " + error.message);
    setEditingId(null);
    router.refresh();
  }

  async function remove(t: Txn) {
    if (!confirm("Hapus transaksi ini? Saldo akun akan otomatis disesuaikan."))
      return;
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", t.id);
    if (error) return alert("Gagal hapus: " + error.message);
    router.refresh();
  }

  const inputCls =
    "rounded-lg border border-neutral-200 bg-white/60 px-2 py-1 text-sm outline-none focus:border-neutral-400 dark:border-white/10 dark:bg-white/5";

  function catOptions(type: string) {
    if (type === "income") {
      return categories
        .filter((c) => c.group_type === "income")
        .map((c) => (
          <option key={c.id} value={c.name}>
            {c.name}
          </option>
        ));
    }
    return EXPENSE_GROUPS.map((g) => {
      const items = categories.filter((c) => c.group_type === g);
      if (items.length === 0) return null;
      return (
        <optgroup key={g} label={GROUP_LABEL[g]}>
          {items.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </optgroup>
      );
    });
  }

  return (
    <div className="glass-card p-6">
      <h2 className="mb-3 text-sm font-medium text-neutral-500">
        Transaksi terakhir
      </h2>

      {transactions.length === 0 && (
        <p className="text-sm text-neutral-400">Belum ada transaksi.</p>
      )}

      <ul className="space-y-2">
        {transactions.map((t) => {
          const isEditing = editingId === t.id;
          const color =
            t.type === "expense"
              ? "text-red-500"
              : t.type === "income"
                ? "text-green-600"
                : "text-neutral-500";
          const sign =
            t.type === "expense" ? "-" : t.type === "income" ? "+" : "↔ ";

          if (isEditing) {
            return (
              <li
                key={t.id}
                className="space-y-2 rounded-lg bg-white/40 p-3 dark:bg-white/5"
              >
                <div className="flex flex-wrap gap-2">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`w-28 ${inputCls}`}
                  />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={inputCls}
                  />
                  {t.type !== "transfer" && (
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Kategori…</option>
                      {catOptions(t.type)}
                    </select>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Catatan"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className={`flex-1 ${inputCls}`}
                  />
                  <button
                    onClick={() => saveEdit(t)}
                    className="rounded-lg bg-neutral-900 px-3 py-1 text-sm text-white dark:bg-white dark:text-neutral-900"
                  >
                    Simpan
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-2 text-sm text-neutral-500"
                  >
                    Batal
                  </button>
                </div>
              </li>
            );
          }

          return (
            <li
              key={t.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="min-w-0 truncate">
                {t.note || t.category || t.type}{" "}
                <span className="text-xs text-neutral-400">
                  {t.category ? `· ${t.category} ` : ""}
                  {t.transaction_date}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className={color}>
                  {sign}
                  {idr(Number(t.amount))}
                </span>
                <button
                  onClick={() => startEdit(t)}
                  className="text-xs text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                >
                  edit
                </button>
                <button
                  onClick={() => remove(t)}
                  className="text-xs text-neutral-400 hover:text-red-500"
                >
                  hapus
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
