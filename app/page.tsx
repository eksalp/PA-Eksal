import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

export default async function DashboardPage() {
  const supabase = createClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="glass-card p-6 text-sm text-neutral-500">
        Silakan login dulu untuk melihat dashboard-mu.
      </div>
    );
  }

  const { data: activities } = await supabase
    .from("activities")
    .select("*")
    .eq("user_id", user.id)
    .eq("scheduled_date", today)
    .order("scheduled_time", { ascending: true, nullsFirst: false });

  const { data: habits } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const { data: todayLogs } = await supabase
    .from("habit_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("log_date", today);

  const currentActivity = activities?.find((a) => a.status === "scheduled");
  const completedCount =
    activities?.filter((a) => a.status === "completed").length ?? 0;

  return (
    <div className="space-y-6">
      <section className="glass-card p-6">
        <h1 className="text-xl font-semibold">Halo 👋</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {format(new Date(), "EEEE, d MMMM yyyy")}
        </p>
      </section>

      <section className="glass-card p-6">
        <h2 className="mb-3 text-sm font-medium text-neutral-500">
          Aktivitas Saat Ini
        </h2>
        {currentActivity ? (
          <div className="text-lg font-medium">{currentActivity.title}</div>
        ) : (
          <p className="text-sm text-neutral-400">
            Tidak ada aktivitas terjadwal berikutnya.
          </p>
        )}
      </section>

      <section className="glass-card p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-500">
            Jadwal Hari Ini
          </h2>
          <span className="text-xs text-neutral-400">
            {completedCount}/{activities?.length ?? 0} selesai
          </span>
        </div>
        <ul className="space-y-2">
          {activities?.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-lg bg-white/40 px-3 py-2 text-sm dark:bg-white/5"
            >
              <span
                className={
                  a.status === "completed"
                    ? "line-through text-neutral-400"
                    : ""
                }
              >
                {a.scheduled_time ? `${a.scheduled_time.slice(0, 5)} — ` : ""}
                {a.title}
              </span>
              <span className="text-xs uppercase text-neutral-400">
                {a.status}
              </span>
            </li>
          ))}
          {(!activities || activities.length === 0) && (
            <p className="text-sm text-neutral-400">
              Belum ada aktivitas hari ini.
            </p>
          )}
        </ul>
      </section>

      <section className="glass-card p-6">
        <h2 className="mb-3 text-sm font-medium text-neutral-500">
          Progress Habit
        </h2>
        <ul className="space-y-2">
          {habits?.map((h) => {
            const log = todayLogs?.find((l) => l.habit_id === h.id);
            const done = log?.completed_count ?? 0;
            return (
              <li
                key={h.id}
                className="flex items-center justify-between text-sm"
              >
                <span>{h.name}</span>
                <span className="text-neutral-400">
                  {done}/{h.target_per_period}
                </span>
              </li>
            );
          })}
          {(!habits || habits.length === 0) && (
            <p className="text-sm text-neutral-400">
              Belum ada habit yang ditrack.
            </p>
          )}
        </ul>
      </section>
    </div>
  );
}
