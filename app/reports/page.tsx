import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DateRangePicker } from "./date-range-picker";

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

const jakartaToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date(),
  );

const keyOf = (d: Date) => d.toISOString().slice(0, 10);
const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

// Deret hari dari startStr..endStr (inklusif), dibatasi 92 kolom biar terbaca.
function daysBetween(startStr: string, endStr: string): Date[] {
  const [sy, sm, sd] = startStr.split("-").map(Number);
  const [ey, em, ed] = endStr.split("-").map(Number);
  let cur = Date.UTC(sy, sm - 1, sd);
  const endU = Date.UTC(ey, em - 1, ed);
  const out: Date[] = [];
  while (cur <= endU && out.length < 92) {
    out.push(new Date(cur));
    const nx = new Date(cur);
    nx.setUTCDate(nx.getUTCDate() + 1);
    cur = nx.getTime();
  }
  return out;
}

function subDaysStr(baseStr: string, n: number): string {
  const [y, m, d] = baseStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - n);
  return keyOf(dt);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: { range?: string; from?: string; to?: string };
}) {
  const supabase = createClient() as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="glass-card p-6 text-sm text-neutral-500">
        Silakan login dulu untuk melihat reports.
      </div>
    );
  }

  const today = jakartaToday();
  const isCustom = isDate(searchParams?.from) && isDate(searchParams?.to);
  const isMonth = !isCustom && searchParams?.range === "month";

  let startStr: string;
  let endStr: string;
  if (isCustom) {
    const a = searchParams!.from!;
    const b = searchParams!.to!;
    startStr = a <= b ? a : b;
    endStr = a <= b ? b : a;
  } else {
    endStr = today;
    startStr = subDaysStr(today, isMonth ? 29 : 6);
  }

  const days = daysBetween(startStr, endStr);
  const effEnd = days.length ? keyOf(days[days.length - 1]) : endStr;

  const [
    { data: activities },
    { data: habits },
    { data: logs },
    { data: txns },
  ] = await Promise.all([
    supabase
      .from("activities")
      .select("scheduled_date, status")
      .eq("user_id", user.id)
      .gte("scheduled_date", startStr)
      .lte("scheduled_date", effEnd),
    supabase
      .from("habits")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true),
    supabase
      .from("habit_logs")
      .select("log_date, habit_id, completed_count")
      .eq("user_id", user.id)
      .gte("log_date", startStr)
      .lte("log_date", effEnd),
    supabase
      .from("transactions")
      .select("type, amount, category, transaction_date")
      .eq("user_id", user.id)
      .gte("transaction_date", startStr)
      .lte("transaction_date", effEnd),
  ]);

  const d10 = (v: any) => String(v).slice(0, 10);
  const acts = activities ?? [];
  const totalAct = acts.length;
  const doneAct = acts.filter((a: any) => a.status === "completed").length;
  const actPct = totalAct ? Math.round((doneAct / totalAct) * 100) : 0;
  const activeHabits = habits?.length ?? 0;
  const wide = days.length > 10;

  const perDay = days.map((d) => {
    const key = keyOf(d);
    const dayActs = acts.filter((a: any) => d10(a.scheduled_date) === key);
    const dayDone = dayActs.filter((a: any) => a.status === "completed").length;
    const habitIds = new Set(
      (logs ?? [])
        .filter(
          (l: any) => d10(l.log_date) === key && Number(l.completed_count) > 0,
        )
        .map((l: any) => l.habit_id),
    );
    return {
      label: wide
        ? String(d.getUTCDate())
        : new Intl.DateTimeFormat("id-ID", {
            timeZone: "UTC",
            weekday: "short",
          }).format(d),
      done: dayDone,
      habitPct: activeHabits
        ? Math.round((habitIds.size / activeHabits) * 100)
        : 0,
    };
  });

  const maxDone = Math.max(1, ...perDay.map((p) => p.done));

  const habitSlots = activeHabits * days.length;
  const habitFilled = new Set(
    (logs ?? [])
      .filter((l: any) => Number(l.completed_count) > 0)
      .map((l: any) => `${d10(l.log_date)}:${l.habit_id}`),
  ).size;
  const habitRate = habitSlots
    ? Math.round((habitFilled / habitSlots) * 100)
    : 0;

  const income = (txns ?? [])
    .filter((t: any) => t.type === "income")
    .reduce((s: number, t: any) => s + Number(t.amount), 0);
  const expense = (txns ?? [])
    .filter((t: any) => t.type === "expense")
    .reduce((s: number, t: any) => s + Number(t.amount), 0);
  const net = income - expense;

  const catMap: Record<string, number> = {};
  (txns ?? [])
    .filter((t: any) => t.type === "expense")
    .forEach((t: any) => {
      const c = t.category || "lainnya";
      catMap[c] = (catMap[c] || 0) + Number(t.amount);
    });
  const topCats = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxCat = Math.max(1, ...topCats.map(([, v]) => v));

  const fmtRange = (s: string) =>
    new Intl.DateTimeFormat("id-ID", {
      timeZone: "UTC",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(s + "T00:00:00Z"));

  return (
    <div className="space-y-6">
      <section className="glass-card space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Reports</h1>
            <p className="mt-1 text-sm text-neutral-500">
              {fmtRange(startStr)} – {fmtRange(effEnd)}
            </p>
          </div>
          <div className="flex gap-1 rounded-full bg-neutral-100 p-1 text-xs dark:bg-white/10">
            <Link
              href="/reports?range=week"
              className={`rounded-full px-3 py-1 ${!isMonth && !isCustom ? "bg-white shadow dark:bg-neutral-800" : "text-neutral-500"}`}
            >
              7 hari
            </Link>
            <Link
              href="/reports?range=month"
              className={`rounded-full px-3 py-1 ${isMonth ? "bg-white shadow dark:bg-neutral-800" : "text-neutral-500"}`}
            >
              30 hari
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3 dark:border-white/5">
          <span className="text-xs text-neutral-400">Atau pilih rentang:</span>
          <DateRangePicker from={startStr} to={effEnd} />
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4">
          <div className="text-xs text-neutral-500">Aktivitas selesai</div>
          <div className="mt-1 text-2xl font-semibold">{actPct}%</div>
          <div className="text-xs text-neutral-400">
            {doneAct}/{totalAct}
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="text-xs text-neutral-500">Habit rate</div>
          <div className="mt-1 text-2xl font-semibold">{habitRate}%</div>
          <div className="text-xs text-neutral-400">
            {activeHabits} habit aktif
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="text-xs text-neutral-500">Net finance</div>
          <div
            className={`mt-1 text-lg font-semibold ${net < 0 ? "text-red-500" : "text-emerald-600"}`}
          >
            {rupiah(net)}
          </div>
        </div>
      </section>

      <section className="glass-card p-6">
        <h2 className="mb-4 text-sm font-medium text-neutral-500">
          Aktivitas Selesai per Hari
        </h2>
        <div className="flex items-end gap-1">
          {perDay.map((p, i) => (
            <div key={i} className="flex-1">
              <div className="flex h-32 items-end">
                <div
                  className="w-full rounded-t bg-neutral-900 dark:bg-white"
                  style={{
                    height:
                      p.done > 0
                        ? `max(${(p.done / maxDone) * 100}%, 4px)`
                        : "0%",
                  }}
                  title={`${p.done} selesai`}
                />
              </div>
              {(!wide || i % 5 === 0) && (
                <div className="mt-1 text-center text-[10px] text-neutral-400">
                  {p.label}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="glass-card p-6">
        <h2 className="mb-4 text-sm font-medium text-neutral-500">
          Habit Completion per Hari (%)
        </h2>
        <div className="flex items-end gap-1">
          {perDay.map((p, i) => (
            <div key={i} className="flex-1">
              <div className="flex h-32 items-end">
                <div
                  className="w-full rounded-t bg-emerald-500"
                  style={{
                    height: p.habitPct > 0 ? `max(${p.habitPct}%, 4px)` : "0%",
                  }}
                  title={`${p.habitPct}%`}
                />
              </div>
              {(!wide || i % 5 === 0) && (
                <div className="mt-1 text-center text-[10px] text-neutral-400">
                  {p.label}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="glass-card p-6">
        <h2 className="mb-4 text-sm font-medium text-neutral-500">Finance</h2>
        <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-emerald-500/10 p-3">
            <div className="text-xs text-neutral-500">Pemasukan</div>
            <div className="font-semibold text-emerald-600">
              {rupiah(income)}
            </div>
          </div>
          <div className="rounded-lg bg-red-500/10 p-3">
            <div className="text-xs text-neutral-500">Pengeluaran</div>
            <div className="font-semibold text-red-500">{rupiah(expense)}</div>
          </div>
        </div>
        {topCats.length > 0 && (
          <div>
            <div className="mb-2 text-xs text-neutral-500">
              Top pengeluaran per kategori
            </div>
            <ul className="space-y-2">
              {topCats.map(([cat, val]) => (
                <li key={cat} className="text-sm">
                  <div className="mb-1 flex justify-between">
                    <span className="capitalize">{cat}</span>
                    <span className="text-neutral-500">{rupiah(val)}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-red-400"
                      style={{ width: `${(val / maxCat) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
