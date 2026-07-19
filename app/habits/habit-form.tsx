"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function HabitForm({ userId }: { userId: string }) {
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [target, setTarget] = useState("1");
  const [busy, setBusy] = useState(false);

  const router = useRouter();
  const supabase = createClient() as any;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("habits").insert({
      user_id: userId,
      name: name.trim(),
      frequency,
      target_per_period: Math.max(1, Number(target) || 1),
      is_active: true,
    });
    setBusy(false);
    if (error) return alert("Gagal: " + error.message);
    setName("");
    setTarget("1");
    router.refresh();
  }

  const inputCls =
    "rounded-lg border border-neutral-200 bg-white/60 px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-white/10 dark:bg-white/5";

  return (
    <form
      onSubmit={add}
      className="glass-card flex flex-wrap items-center gap-2 p-4"
    >
      <input
        placeholder="Habit baru (mis. Stretching)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={`flex-1 ${inputCls}`}
      />
      <select
        value={frequency}
        onChange={(e) => setFrequency(e.target.value)}
        className={inputCls}
      >
        <option value="daily">Harian</option>
        <option value="weekly">Mingguan</option>
      </select>
      <input
        type="number"
        min={1}
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        className={`w-20 ${inputCls}`}
        title="Target per periode"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
      >
        {busy ? "…" : "Tambah"}
      </button>
    </form>
  );
}
