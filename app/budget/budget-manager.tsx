"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Cat = {
  id: string;
  name: string;
  group_type: string;
  due_date: number | null;
  budgeted: number;
  actual: number;
};

const GROUPS: { key: string; label: string }[] = [
  { key: "income", label: "Pemasukan" },
  { key: "bills", label: "Tagihan" },
  { key: "subscriptions", label: "Langganan" },
  { key: "expenses", label: "Pengeluaran" },
  { key: "savings", label: "Tabungan & Investasi" },
];

const idr = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

export function BudgetManager({
  userId,
  month,
  categories,
}: {
  userId: string;
  month: string;
  categories: Cat[];
}) {
  const [cats, setCats] = useState<Cat[]>(categories);
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState("expenses");

  const router = useRouter();
  const supabase = createClient() as any;

  async function saveBudget(catId: string, amount: number) {
    setCats((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, budgeted: amount } : c)),
    );
    const { error } = await supabase
      .from("budgets")
      .upsert(
        { user_id: userId, category_id: catId, month, amount },
        { onConflict: "user_id,category_id,month" },
      );
    if (error) alert("Gagal simpan budget: " + error.message);
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const { data, error } = await supabase
      .from("budget_categories")
      .insert({ user_id: userId, name: newName.trim(), group_type: newGroup })
      .select()
      .single();
    if (error) return alert("Gagal: " + error.message);
    setCats((prev) => [
      ...prev,
      {
        id: data.id,
        name: data.name,
        group_type: data.group_type,
        due_date: null,
        budgeted: 0,
        actual: 0,
      },
    ]);
    setNewName("");
  }

  async function removeCategory(cat: Cat) {
    if (!confirm(`Hapus kategori "${cat.name}"?`)) return;
    setCats((prev) => prev.filter((c) => c.id !== cat.id));
    const { error } = await supabase
      .from("budget_categories")
      .delete()
      .eq("id", cat.id);
    if (error) alert("Gagal: " + error.message);
  }

  // Ringkasan zero-based
  const incomeBudget = cats
    .filter((c) => c.group_type === "income")
    .reduce((s, c) => s + c.budgeted, 0);
  const outBudget = cats
    .filter((c) => c.group_type !== "income")
    .reduce((s, c) => s + c.budgeted, 0);
  const leftToBudget = incomeBudget - outBudget;

  return (
    <>
      {/* Ringkasan zero-based */}
      <section className="glass-card p-6">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xs text-neutral-500">
              Pemasukan dianggarkan
            </div>
            <div className="mt-1 font-semibold text-emerald-600">
              {idr(incomeBudget)}
            </div>
          </div>
          <div>
            <div className="text-xs text-neutral-500">Dialokasikan</div>
            <div className="mt-1 font-semibold">{idr(outBudget)}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500">Sisa dialokasikan</div>
            <div
              className={`mt-1 font-semibold ${leftToBudget < 0 ? "text-red-500" : leftToBudget === 0 ? "text-neutral-500" : "text-amber-600"}`}
            >
              {idr(leftToBudget)}
            </div>
          </div>
        </div>
        {leftToBudget !== 0 && (
          <p className="mt-3 text-center text-xs text-neutral-400">
            {leftToBudget > 0
              ? "Masih ada uang yang belum dialokasikan (target zero-based: Rp 0)."
              : "Alokasi melebihi pemasukan — kurangi budget."}
          </p>
        )}
      </section>

      {/* Grid per grup */}
      {GROUPS.map((g) => {
        const rows = cats.filter((c) => c.group_type === g.key);
        if (rows.length === 0) return null;
        const subBudget = rows.reduce((s, c) => s + c.budgeted, 0);
        const subActual = rows.reduce((s, c) => s + c.actual, 0);
        return (
          <section key={g.key} className="glass-card p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-neutral-500">
                {g.label}
              </h2>
              <span className="text-xs text-neutral-400">
                {idr(subActual)} / {idr(subBudget)}
              </span>
            </div>

            <div className="hidden grid-cols-[1fr_110px_110px_110px] gap-2 pb-2 text-[11px] uppercase tracking-wide text-neutral-400 sm:grid">
              <span>Kategori</span>
              <span className="text-right">Budget</span>
              <span className="text-right">Aktual</span>
              <span className="text-right">Selisih</span>
            </div>

            <ul className="space-y-2">
              {rows.map((c) => {
                const variance = c.budgeted - c.actual;
                const over =
                  g.key !== "income" && c.actual > c.budgeted && c.budgeted > 0;
                return (
                  <li
                    key={c.id}
                    className="grid grid-cols-[1fr_110px_110px_110px] items-center gap-2 text-sm"
                  >
                    <span className="flex items-center gap-2 truncate">
                      {c.name}
                      <button
                        onClick={() => removeCategory(c)}
                        className="text-[10px] text-neutral-300 hover:text-red-500"
                        title="Hapus kategori"
                      >
                        ✕
                      </button>
                    </span>
                    <input
                      type="number"
                      defaultValue={c.budgeted || ""}
                      placeholder="0"
                      onBlur={(e) =>
                        saveBudget(c.id, Number(e.target.value) || 0)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          (e.target as HTMLInputElement).blur();
                      }}
                      className="w-full rounded-lg border border-neutral-200 bg-white/60 px-2 py-1 text-right text-sm outline-none focus:border-neutral-400 dark:border-white/10 dark:bg-white/5"
                    />
                    <span className="text-right tabular-nums text-neutral-500">
                      {idr(c.actual)}
                    </span>
                    <span
                      className={`text-right tabular-nums ${over ? "text-red-500" : "text-neutral-500"}`}
                    >
                      {idr(variance)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {/* Tambah kategori */}
      <section className="glass-card p-6">
        <h2 className="mb-3 text-sm font-medium text-neutral-500">
          Tambah Kategori
        </h2>
        <form onSubmit={addCategory} className="flex flex-wrap gap-2">
          <input
            placeholder="Nama kategori"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 rounded-lg border border-neutral-200 bg-white/60 px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-white/10 dark:bg-white/5"
          />
          <select
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white/60 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
          >
            {GROUPS.map((g) => (
              <option key={g.key} value={g.key}>
                {g.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white dark:bg-white dark:text-neutral-900"
          >
            +
          </button>
        </form>
      </section>
    </>
  );
}
