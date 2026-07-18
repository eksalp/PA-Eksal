"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type Habit = Database["public"]["Tables"]["habits"]["Row"];

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
  const router = useRouter();
  const supabase = createClient();

  async function increment() {
    const next = count + 1;
    setCount(next);
    // upsert: satu baris per habit per hari (lihat unique constraint di schema)
    await supabase
      .from("habit_logs")
      .upsert(
        { habit_id: habit.id, user_id: userId, log_date: logDate, completed_count: next },
        { onConflict: "habit_id,log_date" }
      );
    router.refresh();
  }

  const done = count >= habit.target_per_period;

  return (
    <div className="glass-card flex items-center justify-between p-4">
      <div>
        <div className="font-medium">{habit.name}</div>
        <div className="text-xs text-neutral-400">
          {count}/{habit.target_per_period} hari ini
        </div>
      </div>
      <button
        onClick={increment}
        disabled={done}
        className="rounded-full bg-neutral-900 px-3 py-1.5 text-xs text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
      >
        {done ? "✓ Selesai" : "Tandai"}
      </button>
    </div>
  );
}
