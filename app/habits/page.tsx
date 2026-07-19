import { createClient } from "@/lib/supabase/server";
import { HabitCheckIn } from "./habit-check-in";
import { HabitForm } from "./habit-form";

const jakartaDate = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date(),
  );

export default async function HabitsPage() {
  const supabase = createClient() as any;
  const today = jakartaDate();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="glass-card p-6 text-sm text-neutral-500">
        Silakan login dulu.
      </div>
    );
  }

  const { data: habits } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at");

  const { data: logs } = await supabase
    .from("habit_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("log_date", today);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Habit Tracker</h1>

      <HabitForm userId={user.id} />

      <div className="grid gap-3 sm:grid-cols-2">
        {(habits ?? []).map((h: any) => {
          const log = (logs ?? []).find((l: any) => l.habit_id === h.id);
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
          Belum ada habit. Tambahkan di atas.
        </p>
      )}
    </div>
  );
}
