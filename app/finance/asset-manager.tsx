"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Asset = {
  id: string;
  name: string;
  category: string;
  estimated_value: number;
};
type Account = { id: string; name: string };
type BudgetCat = { id: string; name: string; group_type: string };

const GROUP_LABEL: Record<string, string> = {
  bills: "Tagihan",
  subscriptions: "Langganan",
  expenses: "Pengeluaran",
  savings: "Tabungan & Investasi",
};

// Urutan grup yang masuk akal untuk pembelian aset (income sengaja tidak
// ditampilkan, karena beli aset bukan pemasukan).
const ASSET_GROUPS = ["savings", "expenses", "bills", "subscriptions"];

const CATS = [
  "property",
  "vehicle",
  "gold",
  "investment",
  "electronic",
  "other",
];
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

export function AssetManager({
  userId,
  assets,
  accounts,
  categories,
}: {
  userId: string;
  assets: Asset[];
  accounts: Account[];
  categories: BudgetCat[];
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("gold");
  const [value, setValue] = useState("");
  const [source, setSource] = useState(""); // "" = tidak potong saldo
  const [budgetCategory, setBudgetCategory] = useState(""); // kategori budget tujuan
  const [busy, setBusy] = useState(false);

  const router = useRouter();
  const supabase = createClient() as any;

  const budgetGroups = ASSET_GROUPS.map((g) => ({
    key: g,
    label: GROUP_LABEL[g],
    items: categories.filter((c) => c.group_type === g),
  })).filter((grp) => grp.items.length > 0);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !value) return;
    setBusy(true);
    const amount = Number(value);

    const { data: asset, error } = await supabase
      .from("assets")
      .insert({
        user_id: userId,
        name: name.trim(),
        category,
        estimated_value: amount,
      })
      .select()
      .single();
    if (error) {
      setBusy(false);
      return alert("Gagal: " + error.message);
    }

    // Kalau dibeli dari sebuah akun: catat sebagai transfer (uang jadi aset),
    // saldo akun otomatis berkurang, net worth tetap (bukan pengeluaran).
    // Kategori transaksi diisi kategori budget pilihan user, supaya
    // realisasinya nyambung ke halaman Budget.
    // related_asset_id mengikat transaksi ke aset -> hapus aset = transaksi
    // ikut terhapus & saldo balik.
    if (source) {
      const { error: e2 } = await supabase.from("transactions").insert({
        user_id: userId,
        account_id: source,
        transfer_to_account_id: null,
        type: "transfer",
        amount,
        category: budgetCategory || "Aset",
        note: `Beli aset: ${name.trim()}`,
        transaction_date: todayWIB(),
        related_asset_id: asset.id,
      });
      if (e2) {
        setBusy(false);
        return alert("Aset tersimpan, tapi gagal potong saldo: " + e2.message);
      }
    }

    setBusy(false);
    setName("");
    setValue("");
    setSource("");
    setBudgetCategory("");
    router.refresh();
  }

  async function remove(a: Asset) {
    if (
      !confirm(
        `Hapus aset "${a.name}"? Transaksi pembeliannya ikut terhapus & saldo akun otomatis balik.`,
      )
    )
      return;
    const { error } = await supabase.from("assets").delete().eq("id", a.id);
    if (error) return alert("Gagal: " + error.message);
    router.refresh();
  }

  const inputCls =
    "rounded-lg border border-neutral-200 bg-white/60 px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-white/10 dark:bg-white/5";

  return (
    <div className="glass-card p-6">
      <h2 className="mb-3 text-sm font-medium text-neutral-500">Aset</h2>

      <ul className="mb-4 space-y-2">
        {assets.map((a) => (
          <li key={a.id} className="flex items-center justify-between text-sm">
            <span>
              {a.name}{" "}
              <span className="text-xs text-neutral-400">({a.category})</span>
            </span>
            <span className="flex items-center gap-3">
              <span className="tabular-nums">
                {idr(Number(a.estimated_value))}
              </span>
              <button
                onClick={() => remove(a)}
                className="text-xs text-neutral-400 hover:text-red-500"
              >
                hapus
              </button>
            </span>
          </li>
        ))}
        {assets.length === 0 && (
          <p className="text-sm text-neutral-400">Belum ada aset.</p>
        )}
      </ul>

      <form onSubmit={add} className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="Nama aset (Emas, Motor…)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`flex-1 ${inputCls}`}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputCls}
          >
            {CATS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Nilai"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={`w-28 ${inputCls}`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-400">Bayar dari:</span>
          <select
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              if (!e.target.value) setBudgetCategory("");
            }}
            className={inputCls}
          >
            <option value="">— tidak potong saldo (aset lama)</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          {/* Cuma relevan kalau memang potong saldo (source terisi) */}
          {source && (
            <select
              value={budgetCategory}
              onChange={(e) => setBudgetCategory(e.target.value)}
              className={`min-w-[160px] ${inputCls}`}
            >
              <option value="">Pilih kategori budget…</option>
              {budgetGroups.map((grp) => (
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

          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          >
            {busy ? "…" : "Tambah aset"}
          </button>
        </div>

        {source && categories.length === 0 && (
          <p className="text-xs text-amber-600">
            Belum ada kategori budget. Tambahkan dulu di menu Budget biar
            realisasinya kehitung (sementara akan dicatat sebagai "Aset").
          </p>
        )}
      </form>
    </div>
  );
}
