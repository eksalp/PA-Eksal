"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Habit = { id: string; name: string; target_per_period: number };

export function HabitCheckIn({
  habit,
  todayCount,
  logDate,
  userId,
}: {
  habit: Habit;
  todayCount: number;
  logDate: string;
  userId: string;
}) {
  const [count, setCount] = useState(todayCount);
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);
  const router = useRouter();
  const supabase = createClient() as any;

  async function updateCount(next: number) {
    const clamped = Math.max(0, Math.min(habit.target_per_period, next));
    if (clamped === count) return;
    setBusy(true);
    setCount(clamped);
    const { error } = await supabase
      .from("habit_logs")
      .upsert(
        {
          habit_id: habit.id,
          user_id: userId,
          log_date: logDate,
          completed_count: clamped,
        },
        { onConflict: "habit_id,log_date" },
      );
    setBusy(false);
    if (error) {
      setCount(count);
      alert("Gagal: " + error.message);
      return;
    }
    router.refresh();
  }

  async function removeHabit() {
    if (
      !confirm(
        `Hapus habit "${habit.name}"? Riwayat check-in-nya tetap tersimpan.`,
      )
    )
      return;
    setHidden(true);
    const { error } = await supabase
      .from("habits")
      .update({ is_active: false })
      .eq("id", habit.id);
    if (error) {
      setHidden(false);
      alert("Gagal: " + error.message);
      return;
    }
    router.refresh();
  }

  if (hidden) return null;
  const done = count >= habit.target_per_period;

  return (
    <div className="glass-card flex items-center justify-between p-4">
      <div className="min-w-0">
        <div
          className={`flex items-center gap-2 font-medium ${done ? "text-emerald-600" : ""}`}
        >
          <span className="truncate">{habit.name}</span>
          {done && "✓"}
          <button
            onClick={removeHabit}
            className="text-[10px] text-neutral-300 hover:text-red-500"
            title="Hapus habit"
          >
            ✕
          </button>
        </div>
        <div className="text-xs text-neutral-400">
          {count}/{habit.target_per_period} hari ini
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => updateCount(count - 1)}
          disabled={busy || count <= 0}
          className="h-8 w-8 rounded-full border border-neutral-200 text-sm disabled:opacity-30 dark:border-white/10"
          aria-label="Kurangi"
        >
          −
        </button>
        <span className="w-6 text-center text-sm tabular-nums">{count}</span>
        <button
          onClick={() => updateCount(count + 1)}
          disabled={busy || done}
          className="h-8 w-8 rounded-full bg-neutral-900 text-sm text-white disabled:opacity-30 dark:bg-white dark:text-neutral-900"
          aria-label="Tambah"
        >
          +
        </button>
      </div>
    </div>
  );
}
