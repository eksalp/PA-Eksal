import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DateRangePicker } from "./date-range-picker";

const pad = (n: number) => String(n).padStart(2, "0");
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
const d10 = (v: any) => String(v).slice(0, 10);
const MONTH_LABEL = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

type HabitRow = { name: string; daysHit: number; pct: number };

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
        Silakan login dulu.
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
  const wide = days.length > 10;

  // Budget month = bulan dari tanggal akhir periode
  const bym = effEnd.slice(0, 7);
  const [by, bm] = bym.split("-").map(Number);
  const bMonthStart = `${bym}-01`;
  const bMonthEnd = `${bym}-${pad(new Date(Date.UTC(by, bm, 0)).getUTCDate())}`;

  const [
    { data: activities },
    { data: habits },
    { data: logs },
    { data: txns },
    { data: accounts },
    { data: assets },
    { data: debts },
    { data: savings },
    { data: goals },
    { data: cats },
    { data: budgetRows },
    { data: bMonthExpense },
  ] = await Promise.all([
    supabase
      .from("activities")
      .select("scheduled_date, status")
      .eq("user_id", user.id)
      .gte("scheduled_date", startStr)
      .lte("scheduled_date", effEnd),
    supabase
      .from("habits")
      .select("id, name")
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
    supabase
      .from("accounts")
      .select("current_balance")
      .eq("user_id", user.id)
      .eq("is_active", true),
    supabase.from("assets").select("estimated_value").eq("user_id", user.id),
    supabase
      .from("debts")
      .select("direction, remaining_amount, status")
      .eq("user_id", user.id)
      .neq("status", "paid"),
    supabase
      .from("savings_goals")
      .select("saved_amount")
      .eq("user_id", user.id),
    supabase
      .from("goals")
      .select("title, current_value, target_value, unit, status")
      .eq("user_id", user.id)
      .neq("status", "archived")
      .limit(6),
    supabase
      .from("budget_categories")
      .select("id, group_type")
      .eq("user_id", user.id),
    supabase
      .from("budgets")
      .select("category_id, amount")
      .eq("user_id", user.id)
      .eq("month", bMonthStart),
    supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", user.id)
      .eq("type", "expense")
      .gte("transaction_date", bMonthStart)
      .lte("transaction_date", bMonthEnd),
  ]);

  const acts = activities ?? [];
  const totalAct = acts.length;
  const doneAct = acts.filter((a: any) => a.status === "completed").length;
  const actPct = totalAct ? Math.round((doneAct / totalAct) * 100) : 0;
  const activeHabits = habits?.length ?? 0;

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

  // ---- Posisi kekayaan (snapshot saat ini) ----
  const totalCash = (accounts ?? []).reduce(
    (s: number, a: any) => s + Number(a.current_balance),
    0,
  );
  const totalAssets = (assets ?? []).reduce(
    (s: number, a: any) => s + Number(a.estimated_value),
    0,
  );
  const totalUtang = (debts ?? [])
    .filter((d: any) => d.direction === "utang")
    .reduce((s: number, d: any) => s + Number(d.remaining_amount), 0);
  const totalPiutang = (debts ?? [])
    .filter((d: any) => d.direction === "piutang")
    .reduce((s: number, d: any) => s + Number(d.remaining_amount), 0);
  const totalSavings = (savings ?? []).reduce(
    (s: number, g: any) => s + Number(g.saved_amount),
    0,
  );
  const netWorth = totalCash + totalAssets + totalPiutang - totalUtang;

  // ---- Budget adherence (bulan dari akhir periode) ----
  const groupOf: Record<string, string> = {};
  (cats ?? []).forEach((c: any) => (groupOf[c.id] = c.group_type));
  const budgetedExpense = (budgetRows ?? [])
    .filter((b: any) => groupOf[b.category_id] !== "income")
    .reduce((s: number, b: any) => s + Number(b.amount), 0);
  const actualExpenseMonth = (bMonthExpense ?? []).reduce(
    (s: number, t: any) => s + Number(t.amount),
    0,
  );
  const budgetPct = budgetedExpense
    ? Math.round((actualExpenseMonth / budgetedExpense) * 100)
    : 0;

  // ---- Rincian per habit ----
  const habitRows: HabitRow[] = (habits ?? [])
    .map((h: any) => {
      const daysHit = new Set(
        (logs ?? [])
          .filter(
            (l: any) => l.habit_id === h.id && Number(l.completed_count) > 0,
          )
          .map((l: any) => d10(l.log_date)),
      ).size;
      return {
        name: h.name,
        daysHit,
        pct: days.length ? Math.round((daysHit / days.length) * 100) : 0,
      };
    })
    .sort((a: HabitRow, b: HabitRow) => b.pct - a.pct);

  // ---- No-spend days dalam periode ----
  const spendDays = new Set(
    (txns ?? [])
      .filter((t: any) => t.type === "expense")
      .map((t: any) => d10(t.transaction_date)),
  );
  const pastDays = days.filter((d) => keyOf(d) <= today);
  const noSpendCount = pastDays.filter((d) => !spendDays.has(keyOf(d))).length;

  const fmtRange = (s: string) =>
    new Intl.DateTimeFormat("id-ID", {
      timeZone: "UTC",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(s + "T00:00:00Z"));

  const barTrack = "flex h-32 items-end";

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

      {/* Posisi kekayaan */}
      <section className="glass-card p-6">
        <h2 className="mb-1 text-sm font-medium text-neutral-500">
          Posisi Kekayaan (saat ini)
        </h2>
        <div className="text-2xl font-semibold">{rupiah(netWorth)}</div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-neutral-500 sm:grid-cols-4">
          <div>
            Kas &amp; rekening
            <br />
            <span className="text-sm text-neutral-900 dark:text-white">
              {rupiah(totalCash)}
            </span>
          </div>
          <div>
            Aset
            <br />
            <span className="text-sm text-neutral-900 dark:text-white">
              {rupiah(totalAssets)}
            </span>
          </div>
          <div>
            Piutang
            <br />
            <span className="text-sm text-emerald-600">
              {rupiah(totalPiutang)}
            </span>
          </div>
          <div>
            Utang
            <br />
            <span className="text-sm text-red-500">-{rupiah(totalUtang)}</span>
          </div>
        </div>
        <div className="mt-2 text-xs text-neutral-400">
          Dari kas di atas, tersimpan di tabungan: {rupiah(totalSavings)}
        </div>
      </section>

      {/* Ringkasan periode */}
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
          <div className="text-xs text-neutral-400">{activeHabits} habit</div>
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

      {/* Budget adherence */}
      <section className="glass-card p-6">
        <h2 className="mb-3 text-sm font-medium text-neutral-500">
          Budget vs Realisasi — {MONTH_LABEL[bm - 1]} {by}
        </h2>
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-neutral-500">
            Realisasi {rupiah(actualExpenseMonth)}
          </span>
          <span className="text-neutral-500">
            Budget {rupiah(budgetedExpense)}
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-white/10">
          <div
            className={`h-full rounded-full ${budgetPct > 100 ? "bg-red-500" : "bg-emerald-500"}`}
            style={{ width: `${Math.min(100, budgetPct)}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-neutral-400">
          {budgetedExpense === 0
            ? "Belum set budget bulan ini."
            : budgetPct > 100
              ? `Over budget ${budgetPct - 100}%`
              : `Terpakai ${budgetPct}% dari budget`}
        </div>
      </section>

      {/* Aktivitas per hari */}
      <section className="glass-card p-6">
        <h2 className="mb-4 text-sm font-medium text-neutral-500">
          Aktivitas Selesai per Hari
        </h2>
        <div className="flex items-end gap-1">
          {perDay.map((p, i) => (
            <div key={i} className="flex-1">
              <div className={barTrack}>
                <div
                  className="w-full rounded-t bg-neutral-900 dark:bg-white"
                  style={{
                    height:
                      p.done > 0
                        ? `max(${(p.done / maxDone) * 100}%, 4px)`
                        : "0%",
                  }}
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

      {/* Habit per hari */}
      <section className="glass-card p-6">
        <h2 className="mb-4 text-sm font-medium text-neutral-500">
          Habit Completion per Hari (%)
        </h2>
        <div className="flex items-end gap-1">
          {perDay.map((p, i) => (
            <div key={i} className="flex-1">
              <div className={barTrack}>
                <div
                  className="w-full rounded-t bg-emerald-500"
                  style={{
                    height: p.habitPct > 0 ? `max(${p.habitPct}%, 4px)` : "0%",
                  }}
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

      {/* Rincian per habit */}
      <section className="glass-card p-6">
        <h2 className="mb-3 text-sm font-medium text-neutral-500">
          Rincian per Habit
        </h2>
        <ul className="space-y-2">
          {habitRows.map((h, i) => (
            <li key={i} className="text-sm">
              <div className="mb-1 flex justify-between">
                <span>{h.name}</span>
                <span className="text-neutral-400">
                  {h.daysHit}/{days.length} hari · {h.pct}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-white/10">
                <div
                  className={`h-full rounded-full ${h.pct >= 70 ? "bg-emerald-500" : h.pct >= 40 ? "bg-amber-400" : "bg-red-400"}`}
                  style={{ width: `${h.pct}%` }}
                />
              </div>
            </li>
          ))}
          {habitRows.length === 0 && (
            <p className="text-sm text-neutral-400">Belum ada habit.</p>
          )}
        </ul>
      </section>

      {/* No-spend + Goals */}
      <section className="glass-card p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-500">
            Hemat & Goals
          </h2>
          <span className="text-xs text-emerald-600">
            {noSpendCount} hari tanpa pengeluaran
          </span>
        </div>
        <ul className="space-y-2">
          {(goals ?? []).map((g: any, i: number) => {
            const pct = Math.min(
              100,
              Math.round(
                (Number(g.current_value) / (Number(g.target_value) || 1)) * 100,
              ),
            );
            return (
              <li key={i} className="text-sm">
                <div className="mb-1 flex justify-between">
                  <span>{g.title}</span>
                  <span className="text-neutral-400">{pct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-neutral-900 dark:bg-white"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
          {(!goals || goals.length === 0) && (
            <p className="text-sm text-neutral-400">Belum ada goal aktif.</p>
          )}
        </ul>
      </section>

      {/* Finance income/expense */}
      <section className="glass-card p-6">
        <h2 className="mb-4 text-sm font-medium text-neutral-500">
          Arus Kas Periode Ini
        </h2>
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
        <p className="mt-3 text-xs text-neutral-400">
          Catatan: transfer, nabung, & beli aset tidak dihitung sebagai
          pemasukan/pengeluaran (cuma pindah wujud).
        </p>
      </section>
    </div>
  );
}
