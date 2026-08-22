import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ActivityItem } from "./activities/activity-item";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

export default async function DashboardPage() {
  const supabase = createClient() as any;
  const today = jakartaDate();
  const nowHHMM = jakartaTime();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return (
      <div className="card p-6 text-sm" style={{ color: "var(--text-3)" }}>
        Silakan login dulu.
      </div>
    );

  const [{ data: activities }, { data: goals }, { data: accounts }] =
    await Promise.all([
      supabase
        .from("activities")
        .select("*")
        .eq("user_id", user.id)
        .eq("scheduled_date", today)
        .order("scheduled_time", { ascending: true, nullsFirst: false }),
      supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "archived")
        .order("created_at", { ascending: false })
        .limit(4),
      supabase
        .from("accounts")
        .select("current_balance")
        .eq("user_id", user.id)
        .eq("is_active", true),
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
  const doneCount = acts.filter((a: any) => a.status === "completed").length;

  return (
    <div className="space-y-5">
      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="section-label">Aktivitas Hari Ini</p>
          <p
            className="mt-2 text-2xl font-bold"
            style={{ color: "var(--text)" }}
          >
            {doneCount}/{acts.length}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
            selesai
          </p>
        </div>
        <div className="card p-4">
          <p className="section-label">Berikutnya</p>
          {nextActivity ? (
            <>
              <p
                className="mt-2 text-sm font-semibold leading-tight"
                style={{ color: "var(--text)" }}
              >
                {nextActivity.title}
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--brand-from)" }}
              >
                {nextActivity.scheduled_time?.slice(0, 5)}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm" style={{ color: "var(--text-3)" }}>
              Semua beres 🎉
            </p>
          )}
        </div>
      </div>

      {/* Jadwal hari ini */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold" style={{ color: "var(--text)" }}>
            Jadwal Hari Ini
          </h2>
          <Link
            href="/activities"
            className="text-xs font-medium"
            style={{ color: "var(--brand-from)" }}
          >
            Lihat semua →
          </Link>
        </div>
        {acts.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-3)" }}>
            Belum ada aktivitas hari ini.
          </p>
        ) : (
          <ul className="space-y-2">
            {acts.slice(0, 5).map((a: any) => (
              <ActivityItem key={a.id} activity={a} />
            ))}
          </ul>
        )}
      </div>

      {/* Goals */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold" style={{ color: "var(--text)" }}>
            Progress Goal
          </h2>
          <Link
            href="/goals"
            className="text-xs font-medium"
            style={{ color: "var(--brand-from)" }}
          >
            Kelola →
          </Link>
        </div>
        <ul className="space-y-4">
          {(goals ?? []).map((g: any) => {
            const pct = Math.min(
              100,
              Math.round(
                (Number(g.current_value) / (Number(g.target_value) || 1)) * 100,
              ),
            );
            return (
              <li key={g.id}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span
                    className="font-medium"
                    style={{ color: "var(--text)" }}
                  >
                    {g.title}
                  </span>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: "var(--brand-from)" }}
                  >
                    {pct}%
                  </span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
          {(!goals || goals.length === 0) && (
            <p className="text-sm" style={{ color: "var(--text-3)" }}>
              Belum ada goal aktif.
            </p>
          )}
        </ul>
      </div>
    </div>
  );
}
