import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DateRangePicker } from "./date-range-picker";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function daysBetween(s: string, e: string): Date[] {
  const [sy, sm, sd] = s.split("-").map(Number),
    [ey, em, ed] = e.split("-").map(Number);
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
function subDaysStr(b: string, n: number): string {
  const [y, m, d] = b.split("-").map(Number);
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
  if (!user)
    return (
      <div className="card p-6 text-sm" style={{ color: "var(--text-3)" }}>
        Silakan login dulu.
      </div>
    );

  const today = jakartaToday();
  const isCustom = isDate(searchParams?.from) && isDate(searchParams?.to);
  const isMonth = !isCustom && searchParams?.range === "month";
  let startStr: string, endStr: string;
  if (isCustom) {
    const a = searchParams!.from!,
      b = searchParams!.to!;
    startStr = a <= b ? a : b;
    endStr = a <= b ? b : a;
  } else {
    endStr = today;
    startStr = subDaysStr(today, isMonth ? 29 : 6);
  }
  const days = daysBetween(startStr, endStr);
  const effEnd = days.length ? keyOf(days[days.length - 1]) : endStr;
  const wide = days.length > 10;
  const bym = effEnd.slice(0, 7);
  const [by, bm] = bym.split("-").map(Number);
  const bMonthStart = `${bym}-01`,
    bMonthEnd = `${bym}-${pad(new Date(Date.UTC(by, bm, 0)).getUTCDate())}`;

  const [
    { data: activities },
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
      .select("scheduled_date,status")
      .eq("user_id", user.id)
      .gte("scheduled_date", startStr)
      .lte("scheduled_date", effEnd),
    supabase
      .from("transactions")
      .select("type,amount,category,transaction_date")
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
      .select("direction,remaining_amount,status")
      .eq("user_id", user.id)
      .neq("status", "paid"),
    supabase
      .from("savings_goals")
      .select("saved_amount")
      .eq("user_id", user.id),
    supabase
      .from("goals")
      .select("title,current_value,target_value,status")
      .eq("user_id", user.id)
      .neq("status", "archived")
      .limit(6),
    supabase
      .from("budget_categories")
      .select("id,group_type")
      .eq("user_id", user.id),
    supabase
      .from("budgets")
      .select("category_id,amount")
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
  const doneAct = acts.filter((a: any) => a.status === "completed").length;
  const actPct = acts.length ? Math.round((doneAct / acts.length) * 100) : 0;

  const perDay = days.map((d) => {
    const key = keyOf(d);
    return {
      label: wide
        ? String(d.getUTCDate())
        : new Intl.DateTimeFormat("id-ID", {
            timeZone: "UTC",
            weekday: "short",
          }).format(d),
      done: acts.filter(
        (a: any) => d10(a.scheduled_date) === key && a.status === "completed",
      ).length,
    };
  });
  const maxDone = Math.max(1, ...perDay.map((p) => p.done));

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

  const Stat = ({
    label,
    value,
    sub,
    color,
  }: {
    label: string;
    value: string;
    sub?: string;
    color?: string;
  }) => (
    <div className="card p-4">
      <p className="section-label">{label}</p>
      <p
        className="mt-2 text-xl font-bold"
        style={{ color: color || "var(--text)" }}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-xs" style={{ color: "var(--text-3)" }}>
          {sub}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
              Reports
            </h1>
            <p className="mt-0.5 text-xs" style={{ color: "var(--text-3)" }}>
              {fmtRange(startStr)} – {fmtRange(effEnd)}
            </p>
          </div>
          <div
            className="flex gap-1.5 rounded-xl p-1"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
            }}
          >
            <Link
              href="/reports?range=week"
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={
                !isMonth && !isCustom
                  ? {
                      background: "var(--surface)",
                      color: "var(--text)",
                      boxShadow: "var(--shadow-sm)",
                    }
                  : { color: "var(--text-3)" }
              }
            >
              7 hari
            </Link>
            <Link
              href="/reports?range=month"
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={
                isMonth
                  ? {
                      background: "var(--surface)",
                      color: "var(--text)",
                      boxShadow: "var(--shadow-sm)",
                    }
                  : { color: "var(--text-3)" }
              }
            >
              30 hari
            </Link>
          </div>
        </div>
        <div
          className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3"
          style={{ borderColor: "var(--border)" }}
        >
          <span className="text-xs" style={{ color: "var(--text-3)" }}>
            Atau pilih rentang:
          </span>
          <DateRangePicker from={startStr} to={effEnd} />
        </div>
      </div>

      {/* Kekayaan */}
      <div className="card-gradient p-5">
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "rgba(255,255,255,.7)" }}
        >
          Posisi Kekayaan
        </p>
        <p className="mt-1 text-3xl font-bold text-white">{rupiah(netWorth)}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
          {[
            ["Kas", totalCash, "rgba(255,255,255,.9)"],
            ["Aset", totalAssets, "rgba(255,255,255,.9)"],
            ["Piutang", totalPiutang, "#86EFAC"],
            ["Utang", -totalUtang, "#FCA5A5"],
          ].map(([l, v, c]: any) => (
            <div key={l}>
              <p style={{ color: "rgba(255,255,255,.6)" }}>{l}</p>
              <p className="font-bold mt-0.5" style={{ color: c }}>
                {rupiah(v)}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs" style={{ color: "rgba(255,255,255,.5)" }}>
          Tersimpan di tabungan: {rupiah(totalSavings)}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Aktivitas selesai"
          value={`${actPct}%`}
          sub={`${doneAct}/${acts.length} aktivitas`}
        />
        <Stat
          label="No-spend days"
          value={`${noSpendCount} hari`}
          sub="tanpa pengeluaran"
          color="var(--green)"
        />
        <Stat label="Pemasukan" value={rupiah(income)} color="var(--green)" />
        <Stat label="Pengeluaran" value={rupiah(expense)} color="var(--red)" />
      </div>

      {/* Budget adherence */}
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-semibold" style={{ color: "var(--text)" }}>
            Budget {MONTH_LABEL[bm - 1]} {by}
          </p>
          <span
            className="text-xs font-semibold"
            style={{ color: budgetPct > 100 ? "var(--red)" : "var(--green)" }}
          >
            {budgetPct}%
          </span>
        </div>
        <div className="progress-track mb-1">
          <div
            className={`progress-fill ${budgetPct > 100 ? "progress-fill-red" : ""}`}
            style={{ width: `${Math.min(100, budgetPct)}%` }}
          />
        </div>
        <p className="text-xs" style={{ color: "var(--text-3)" }}>
          {budgetedExpense === 0
            ? "Belum set budget."
            : budgetPct > 100
              ? `Over budget ${budgetPct - 100}% · Realisasi ${rupiah(actualExpenseMonth)} dari ${rupiah(budgetedExpense)}`
              : `Terpakai ${rupiah(actualExpenseMonth)} dari ${rupiah(budgetedExpense)}`}
        </p>
      </div>

      {/* Aktivitas bar chart */}
      <div className="card p-5">
        <p className="mb-4 font-semibold" style={{ color: "var(--text)" }}>
          Aktivitas Selesai per Hari
        </p>
        <div className="flex items-end gap-1" style={{ height: 100 }}>
          {perDay.map((p, i) => (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end gap-1"
            >
              <div
                className="w-full rounded-t"
                style={{
                  height:
                    p.done > 0
                      ? `${Math.max(4, (p.done / maxDone) * 80)}px`
                      : "2px",
                  background:
                    p.done > 0
                      ? "linear-gradient(180deg,#4F78FF,#7C5CFC)"
                      : "var(--border)",
                  borderRadius: 4,
                }}
              />
              {(!wide || i % 5 === 0) && (
                <span
                  className="text-center"
                  style={{ fontSize: 9, color: "var(--text-3)" }}
                >
                  {p.label}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Goals */}
      <div className="card p-5">
        <p className="mb-4 font-semibold" style={{ color: "var(--text)" }}>
          Progress Goals
        </p>
        <div className="space-y-3">
          {(goals ?? []).map((g: any) => {
            const pct = Math.min(
              100,
              Math.round(
                (Number(g.current_value) / (Number(g.target_value) || 1)) * 100,
              ),
            );
            return (
              <div key={g.title}>
                <div className="mb-1 flex justify-between text-sm">
                  <span style={{ color: "var(--text)" }}>{g.title}</span>
                  <span
                    className="font-semibold"
                    style={{ color: "var(--brand-from)" }}
                  >
                    {pct}%
                  </span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          {(!goals || goals.length === 0) && (
            <p className="text-sm" style={{ color: "var(--text-3)" }}>
              Belum ada goal aktif.
            </p>
          )}
        </div>
      </div>

      {/* Top kategori */}
      {topCats.length > 0 && (
        <div className="card p-5">
          <p className="mb-4 font-semibold" style={{ color: "var(--text)" }}>
            Top Pengeluaran per Kategori
          </p>
          <div className="space-y-3">
            {topCats.map(([cat, val]) => (
              <div key={cat}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="capitalize" style={{ color: "var(--text)" }}>
                    {cat}
                  </span>
                  <span style={{ color: "var(--text-2)" }}>{rupiah(val)}</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill-red"
                    style={{
                      height: 6,
                      borderRadius: 99,
                      width: `${(val / maxCat) * 100}%`,
                      background: "var(--red)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs" style={{ color: "var(--text-3)" }}>
            Transfer, nabung & beli aset tidak dihitung sebagai pengeluaran.
          </p>
        </div>
      )}
    </div>
  );
}
