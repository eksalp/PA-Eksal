"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type TxnType = "income" | "expense" | "transfer";
type Account = { id: string; name: string };
type BudgetCat = { id: string; name: string; group_type: string };

const GROUP_LABEL: Record<string, string> = {
  income: "Pemasukan",
  bills: "Tagihan",
  subscriptions: "Langganan",
  expenses: "Pengeluaran",
  savings: "Tabungan & Investasi",
};

// Urutan grup yang ditampilkan untuk transaksi pengeluaran.
const EXPENSE_GROUPS = ["expenses", "bills", "subscriptions", "savings"];

const today = () => new Date().toISOString().slice(0, 10);

export function NewTransactionForm({
  userId,
  accounts,
  categories,
}: {
  userId: string;
  accounts: Account[];
  categories: BudgetCat[];
}) {
  const [type, setType] = useState<TxnType>("expense");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(today());
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? "");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient() as any;

  // Kategori yang relevan dengan tipe transaksi
  const incomeCats = categories.filter((c) => c.group_type === "income");
  const expenseGroups = EXPENSE_GROUPS.map((g) => ({
    key: g,
    label: GROUP_LABEL[g],
    items: categories.filter((c) => c.group_type === g),
  })).filter((grp) => grp.items.length > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;
    if (type === "transfer" && accountId === toAccountId) {
      alert("Akun asal dan tujuan tidak boleh sama.");
      return;
    }
    setLoading(true);

    const { error } = await supabase.from("transactions").insert({
      user_id: userId,
      account_id: accountId || null,
      transfer_to_account_id: type === "transfer" ? toAccountId || null : null,
      type,
      amount: Number(amount),
      category: type === "transfer" ? null : category || null,
      note: note || null,
      transaction_date: date,
    });

    setLoading(false);
    if (error) {
      alert("Gagal menyimpan: " + error.message);
      return;
    }

    setAmount("");
    setNote("");
    setCategory("");
    router.refresh();
  }

  const inputCls =
    "rounded-lg border border-neutral-200 bg-white/60 px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-white/10 dark:bg-white/5";

  return (
    <form onSubmit={handleSubmit} className="glass-card space-y-3 p-6">
      <h2 className="text-sm font-medium text-neutral-500">Tambah Transaksi</h2>

      <div className="flex flex-wrap gap-2">
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value as TxnType);
            setCategory("");
          }}
          className={inputCls}
        >
          <option value="expense">Pengeluaran</option>
          <option value="income">Pemasukan</option>
          <option value="transfer">Transfer</option>
        </select>

        <input
          type="number"
          placeholder="Jumlah"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={`w-32 ${inputCls}`}
        />

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputCls}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className={inputCls}
        >
          <option value="">
            {type === "transfer" ? "Dari akun…" : "Akun…"}
          </option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        {type === "transfer" && (
          <select
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
            className={inputCls}
          >
            <option value="">Ke akun…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        )}

        {/* Kategori diambil dari kategori Budget, dikelompokkan */}
        {type !== "transfer" && (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`min-w-[160px] ${inputCls}`}
          >
            <option value="">Pilih kategori…</option>
            {type === "income"
              ? incomeCats.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))
              : expenseGroups.map((grp) => (
                  <optgroup key={grp.key} label={grp.label}>
                    {grp.items.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
          </select>
        )}
      </div>

      {type !== "transfer" && categories.length === 0 && (
        <p className="text-xs text-amber-600">
          Belum ada kategori. Tambahkan dulu di menu Budget biar transaksinya
          kehitung.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Catatan (opsional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={`flex-1 ${inputCls}`}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {loading ? "…" : "Tambah"}
        </button>
      </div>
    </form>
  );
}
