"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Activity = {
  id: string;
  title: string;
  scheduled_time: string | null;
  status: string;
};

export function ActivityItem({ activity }: { activity: Activity }) {
  const router = useRouter();
  const supabase = createClient() as any;

  async function mark(status: string) {
    await supabase.from("activities").update({ status }).eq("id", activity.id);
    router.refresh();
  }

  const done = activity.status === "completed";
  const skipped = activity.status === "skipped";

  return (
    <li
      className="flex items-center gap-3 rounded-xl p-3 transition-colors"
      style={{
        background: done
          ? "rgba(34,197,94,.06)"
          : skipped
            ? "var(--surface-2)"
            : "var(--surface-2)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="min-w-0 flex-1">
        <p
          className="text-sm font-medium"
          style={{
            color: done
              ? "var(--green)"
              : skipped
                ? "var(--text-3)"
                : "var(--text)",
            textDecoration: skipped ? "line-through" : "none",
          }}
        >
          {activity.title}
        </p>
        {activity.scheduled_time && (
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-3)" }}>
            {activity.scheduled_time.slice(0, 5)}
          </p>
        )}
      </div>
      {!done && !skipped && (
        <div className="flex gap-1.5">
          <button
            onClick={() => mark("completed")}
            className="rounded-lg px-2.5 py-1 text-xs font-semibold"
            style={{ background: "rgba(34,197,94,.12)", color: "var(--green)" }}
          >
            Selesai
          </button>
          <button
            onClick={() => mark("skipped")}
            className="rounded-lg px-2.5 py-1 text-xs font-semibold"
            style={{
              background: "var(--surface-2)",
              color: "var(--text-3)",
              border: "1px solid var(--border)",
            }}
          >
            Skip
          </button>
        </div>
      )}
      {done && <span className="text-base">✓</span>}
    </li>
  );
}
