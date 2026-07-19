import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ActivityItem } from "./activities/activity-item";
import { HabitCheckIn } from "./habits/habit-check-in";

const jakartaDate = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date(),
  );
const jakartaTime = () =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
const jakartaLabel = () =>
  new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

const idr = (n: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);

export default async function DashboardPage() {
  const supabase = createClient() as any;
  const today = jakartaDate();
  const nowHHMM = jakartaTime();

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

  const [
    { data: activities },
    { data: habits },
    { data: todayLogs },
    { data: goals },
  ] = await Promise.all([
    supabase
      .from("activities")
      .select("*")
      .eq("user_id", user.id)
      .eq("scheduled_date", today)
      .order("scheduled_time", { ascending: true, nullsFirst: false }),
    supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at"),
    supabase
      .from("habit_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("log_date", today),
    supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const acts = activities ?? [];
  const upcoming = acts
    .filter(
      (a: any) =>
        a.scheduled_time &&
        a.status === "scheduled" &&
        a.scheduled_time.slice(0, 5) >= nowHHMM,
    )
    .sort((a: any, b: any) => a.scheduled_time.localeCompare(b.scheduled_time));
  const nextActivity = upcoming[0] ?? null;
  const completedCount = acts.filter(
    (a: any) => a.status === "completed",
  ).length;

  return (
    <div className="space-y-6">
      <section className="glass-card p-6">
        <h1 className="text-xl font-semibold">Halo 👋</h1>
        <p className="mt-1 text-sm text-neutral-500">{jakartaLabel()}</p>
      </section>

      <section className="glass-card p-6">
        <h2 className="mb-3 text-sm font-medium text-neutral-500">
          Aktivitas Berikutnya
        </h2>
        {nextActivity ? (
          <div className="text-lg font-medium">
            <span className="text-neutral-400">
              {nextActivity.scheduled_time.slice(0, 5)} ·{" "}
            </span>
            {nextActivity.title}
          </div>
        ) : (
          <p className="text-sm text-neutral-400">
            Tidak ada aktivitas terjadwal lagi hari ini. 🎉
          </p>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-500">
            Jadwal Hari Ini
          </h2>
          <span className="text-xs text-neutral-400">
            {completedCount}/{acts.length} selesai
          </span>
        </div>
        <ul className="space-y-2">
          {acts.map((a: any) => (
            <ActivityItem key={a.id} activity={a} />
          ))}
          {acts.length === 0 && (
            <p className="glass-card p-4 text-sm text-neutral-400">
              Belum ada aktivitas hari ini.
            </p>
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-neutral-500">
          Progress Habit
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(habits ?? []).map((h: any) => {
            const log = (todayLogs ?? []).find((l: any) => l.habit_id === h.id);
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
          <p className="glass-card p-4 text-sm text-neutral-400">
            Belum ada habit yang ditrack.
          </p>
        )}
      </section>

      <section className="glass-card p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-500">
            Progress Goal
          </h2>
          <Link
            href="/goals"
            className="text-xs text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          >
            Kelola →
          </Link>
        </div>
        <ul className="space-y-3">
          {(goals ?? []).map((g: any) => {
            const pct = Math.min(
              100,
              Math.round(
                (Number(g.current_value) / (Number(g.target_value) || 1)) * 100,
              ),
            );
            const done = g.status === "done";
            return (
              <li key={g.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className={done ? "text-emerald-600" : ""}>
                    {g.title} {done && "✓"}
                  </span>
                  <span className="text-neutral-400">
                    {idr(Number(g.current_value))}/{idr(Number(g.target_value))}{" "}
                    {g.unit ?? ""}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-white/10">
                  <div
                    className={`h-full rounded-full ${done ? "bg-emerald-500" : "bg-neutral-900 dark:bg-white"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
          {(!goals || goals.length === 0) && (
            <p className="text-sm text-neutral-400">
              Belum ada goal. Tambahkan di menu Goals.
            </p>
          )}
        </ul>
      </section>
    </div>
  );
}
