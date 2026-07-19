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

export function AssetManager({
  userId,
  assets,
}: {
  userId: string;
  assets: Asset[];
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("other");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const router = useRouter();
  const supabase = createClient() as any;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !value) return;
    setBusy(true);
    const { error } = await supabase.from("assets").insert({
      user_id: userId,
      name: name.trim(),
      category,
      estimated_value: Number(value),
    });
    setBusy(false);
    if (error) return alert("Gagal: " + error.message);
    setName("");
    setValue("");
    router.refresh();
  }

  async function remove(a: Asset) {
    if (!confirm(`Hapus aset "${a.name}"?`)) return;
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

      <form onSubmit={add} className="flex flex-wrap gap-2">
        <input
          placeholder="Nama aset (Motor, Emas…)"
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
