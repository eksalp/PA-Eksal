import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { HabitCheckIn } from "./habit-check-in";

export default async function HabitsPage() {
  const supabase = createClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="glass-card p-6 text-sm text-neutral-500">Silakan login dulu.</div>;
  }

  const { data: habits } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const { data: logs } = await supabase
    .from("habit_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("log_date", today);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Habit Tracker</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {habits?.map((h) => {
          const log = logs?.find((l) => l.habit_id === h.id);
          return (
            <HabitCheckIn
              key={h.id}
              habit={h}
              todayCount={log?.completed_count ?? 0}
              logDate={today}
              userId={user.id}
            />
          );
        })}
      </div>
      {(!habits || habits.length === 0) && (
        <p className="text-sm text-neutral-400">
          Belum ada habit. Tambahkan lewat Supabase Studio untuk sekarang — form tambah habit
          bisa dibuat di iterasi berikutnya.
        </p>
      )}
    </div>
  );
}
