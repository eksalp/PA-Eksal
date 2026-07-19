"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Goal = {
  id: string;
  user_id: string;
  title: string;
  category: string | null;
  target_value: number;
  current_value: number;
  unit: string | null;
  deadline: string | null;
  status: string;
  created_at: string;
};

const CATEGORIES = ["fitness", "learning", "career", "finance", "personal"];

export function GoalManager({
  initialGoals,
  userId,
}: {
  initialGoals: Goal[];
  userId: string;
}) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [busy, setBusy] = useState(false);

  // Form tambah goal
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState<string>("");
  const [deadline, setDeadline] = useState("");

  // cast: tabel "goals" belum ada di tipe hasil-generate
  const supabase = createClient() as any;

  async function addGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !target) return;
    setBusy(true);

    const { data, error } = await supabase
      .from("goals")
      .insert({
        user_id: userId,
        title: title.trim(),
        target_value: Number(target),
        current_value: 0,
        unit: unit.trim() || null,
        category: category || null,
        deadline: deadline || null,
        status: "active",
      })
      .select()
      .single();

    setBusy(false);
    if (error) {
      alert("Gagal menambah goal: " + error.message);
      return;
    }

    setGoals([data as Goal, ...goals]);
    setTitle("");
    setTarget("");
    setUnit("");
    setCategory("");
    setDeadline("");
  }

  async function updateProgress(goal: Goal, newValue: number) {
    const clamped = Math.max(0, newValue);
    const status = clamped >= goal.target_value ? "done" : "active";

    // optimistic update
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goal.id ? { ...g, current_value: clamped, status } : g,
      ),
    );

    const { error } = await supabase
      .from("goals")
      .update({
        current_value: clamped,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", goal.id);

    if (error) alert("Gagal update: " + error.message);
  }

  async function deleteGoal(goal: Goal) {
    if (!confirm(`Hapus goal "${goal.title}"?`)) return;
    setGoals((prev) => prev.filter((g) => g.id !== goal.id));
    const { error } = await supabase.from("goals").delete().eq("id", goal.id);
    if (error) alert("Gagal hapus: " + error.message);
  }

  return (
    <>
      {/* Form tambah goal */}
      <section className="glass-card p-6">
        <h2 className="mb-4 text-sm font-medium text-neutral-500">
          Tambah Goal
        </h2>
        <form onSubmit={addGoal} className="space-y-3">
          <input
            type="text"
            placeholder="Judul goal (misal: Lari bulan ini)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white/60 px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-white/10 dark:bg-white/5"
          />
          <div className="flex gap-3">
            <input
              type="number"
              placeholder="Target (misal: 50)"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white/60 px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-white/10 dark:bg-white/5"
            />
            <input
              type="text"
              placeholder="Satuan (km, buku…)"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white/60 px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-white/10 dark:bg-white/5"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white/60 px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-white/10 dark:bg-white/5"
            >
              <option value="">Kategori (opsional)</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white/60 px-3 py-2 text-sm text-neutral-600 outline-none focus:border-neutral-400 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            {busy ? "Menyimpan…" : "Tambah"}
          </button>
        </form>
      </section>

      {/* Daftar goals */}
      <section className="glass-card p-6">
        <h2 className="mb-4 text-sm font-medium text-neutral-500">
          Daftar Goal
        </h2>

        {goals.length === 0 && (
          <p className="text-sm text-neutral-400">
            Belum ada goal. Tambahin di atas.
          </p>
        )}

        <ul className="space-y-4">
          {goals.map((g) => {
            const pct = Math.min(
              100,
              Math.round((g.current_value / (g.target_value || 1)) * 100),
            );
            const done = g.status === "done";
            return (
              <li
                key={g.id}
                className="rounded-xl bg-white/40 p-4 dark:bg-white/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div
                      className={`font-medium ${done ? "text-emerald-600" : ""}`}
                    >
                      {g.title} {done && "✓"}
                    </div>
                    <div className="mt-0.5 text-xs text-neutral-400">
                      {g.category ? `${g.category} · ` : ""}
                      {g.current_value}
                      {g.unit ? ` ${g.unit}` : ""} / {g.target_value}
                      {g.unit ? ` ${g.unit}` : ""}
                      {g.deadline ? ` · target ${g.deadline}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteGoal(g)}
                    className="text-xs text-neutral-400 hover:text-red-500"
                  >
                    hapus
                  </button>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-white/10">
                  <div
                    className={`h-full rounded-full ${done ? "bg-emerald-500" : "bg-neutral-900 dark:bg-white"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Kontrol update */}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => updateProgress(g, g.current_value - 1)}
                    className="h-7 w-7 rounded-full border border-neutral-200 text-sm dark:border-white/10"
                  >
                    −
                  </button>
                  <button
                    onClick={() => updateProgress(g, g.current_value + 1)}
                    className="h-7 w-7 rounded-full border border-neutral-200 text-sm dark:border-white/10"
                  >
                    +
                  </button>
                  <input
                    type="number"
                    defaultValue={g.current_value}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        updateProgress(
                          g,
                          Number((e.target as HTMLInputElement).value),
                        );
                      }
                    }}
                    className="ml-1 w-20 rounded-lg border border-neutral-200 bg-white/60 px-2 py-1 text-sm outline-none focus:border-neutral-400 dark:border-white/10 dark:bg-white/5"
                  />
                  <span className="text-xs text-neutral-400">{pct}%</span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
