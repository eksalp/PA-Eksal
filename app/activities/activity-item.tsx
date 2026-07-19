"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Activity = {
  id: string;
  title: string;
  scheduled_time: string | null;
  category: string | null;
  status: string;
};

export function ActivityItem({ activity }: { activity: Activity }) {
  const [status, setStatus] = useState(activity.status);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const supabase = createClient() as any;

  async function setTo(newStatus: string) {
    const target = status === newStatus ? "scheduled" : newStatus; // klik lagi = batal
    setBusy(true);
    setStatus(target);
    const { error } = await supabase
      .from("activities")
      .update({ status: target })
      .eq("id", activity.id);
    setBusy(false);
    if (error) {
      setStatus(activity.status);
      alert("Gagal: " + error.message);
      return;
    }
    router.refresh();
  }

  const done = status === "completed";
  const skipped = status === "skipped";

  return (
    <li className="glass-card flex items-center justify-between gap-3 p-4 text-sm">
      <div
        className={
          done
            ? "text-neutral-400 line-through"
            : skipped
              ? "text-neutral-400"
              : ""
        }
      >
        <span className="font-medium">{activity.title}</span>
        {activity.scheduled_time && (
          <span className="ml-2 text-neutral-400">
            {activity.scheduled_time.slice(0, 5)}
          </span>
        )}
        {activity.category && (
          <span className="ml-2 rounded-full bg-neutral-200 px-2 py-0.5 text-xs dark:bg-white/10">
            {activity.category}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => setTo("completed")}
          disabled={busy}
          className={`rounded-full px-3 py-1 text-xs ${
            done
              ? "bg-emerald-500 text-white"
              : "border border-neutral-200 text-neutral-500 hover:border-emerald-400 hover:text-emerald-600 dark:border-white/10"
          }`}
        >
          {done ? "Selesai ✓" : "Selesai"}
        </button>
        <button
          onClick={() => setTo("skipped")}
          disabled={busy}
          className={`rounded-full px-3 py-1 text-xs ${
            skipped
              ? "bg-neutral-400 text-white"
              : "border border-neutral-200 text-neutral-400 hover:border-neutral-400 dark:border-white/10"
          }`}
        >
          Skip
        </button>
      </div>
    </li>
  );
}
