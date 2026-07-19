import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
const rupiahShort = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)}rb`;
  return String(Math.round(n));
};

const jakartaToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date(),
  );

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

function lastNMonths(n: number) {
  const [y, m] = jakartaToday().split("-").map(Number);
  const arr: {
    y: number;
    m: number;
    key: string;
    label: string;
    start: string;
  }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    const yy = d.getUTCFullYear();
    const mm = d.getUTCMonth() + 1;
    arr.push({
      y: yy,
      m: mm,
      key: `${yy}-${String(mm).padStart(2, "0")}`,
      label: `${MONTHS[mm - 1]} ${String(yy).slice(2)}`,
      start: `${yy}-${String(mm).padStart(2, "0")}-01`,
    });
  }
  return arr;
}

export default async function BudgetReportPage({
  searchParams,
}: {
  searchParams?: { months?: string };
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

  const n = searchParams?.months === "12" ? 12 : 6;
  const months = lastNMonths(n);
  const rangeStart = months[0].start;
  const today = jakartaToday();

  const [{ data: cats }, { data: budgetRows }, { data: txns }] =
    await Promise.all([
      supabase
        .from("budget_categories")
        .select("id, group_type")
        .eq("user_id", user.id),
      supabase
        .from("budgets")
        .select("category_id, month, amount")
        .eq("user_id", user.id)
        .gte("month", rangeStart),
      supabase
        .from("transactions")
        .select("type, amount, transaction_date")
        .eq("user_id", user.id)
        .gte("transaction_date", rangeStart)
        .lte("transaction_date", today),
    ]);

  const groupOf: Record<string, string> = {};
  (cats ?? []).forEach((c: any) => (groupOf[c.id] = c.group_type));

  const rows = months.map((mo) => {
    const budgetedExpense = (budgetRows ?? [])
      .filter(
        (b: any) =>
          String(b.month).slice(0, 7) === mo.key &&
          groupOf[b.category_id] !== "income",
      )
      .reduce((s: number, b: any) => s + Number(b.amount), 0);
    const actualExpense = (txns ?? [])
      .filter(
        (t: any) =>
          t.type === "expense" &&
          String(t.transaction_date).slice(0, 7) === mo.key,
      )
      .reduce((s: number, t: any) => s + Number(t.amount), 0);
    const actualIncome = (txns ?? [])
      .filter(
        (t: any) =>
          t.type === "income" &&
          String(t.transaction_date).slice(0, 7) === mo.key,
      )
      .reduce((s: number, t: any) => s + Number(t.amount), 0);
    return {
      ...mo,
      budgetedExpense,
      actualExpense,
      actualIncome,
      variance: budgetedExpense - actualExpense,
    };
  });

  const maxBar = Math.max(
    1,
    ...rows.map((r) => Math.max(r.budgetedExpense, r.actualExpense)),
  );
  const totalBudget = rows.reduce((s, r) => s + r.budgetedExpense, 0);
  const totalActual = rows.reduce((s, r) => s + r.actualExpense, 0);
  const monthsOver = rows.filter(
    (r) => r.budgetedExpense > 0 && r.actualExpense > r.budgetedExpense,
  ).length;
  const avgSpend = rows.length ? totalActual / rows.length : 0;

  return (
    <div className="space-y-6">
      <section className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/budget"
              className="text-xs text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            >
              ‹ Budget
            </Link>
            <h1 className="mt-1 text-xl font-semibold">Tren Budget</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Budget vs realisasi pengeluaran per bulan.
            </p>
          </div>
          <div className="flex gap-1 rounded-full bg-neutral-100 p-1 text-xs dark:bg-white/10">
            <Link
              href="/budget/report?months=6"
              className={`rounded-full px-3 py-1 ${n === 6 ? "bg-white shadow dark:bg-neutral-800" : "text-neutral-500"}`}
            >
              6 bln
            </Link>
            <Link
              href="/budget/report?months=12"
              className={`rounded-full px-3 py-1 ${n === 12 ? "bg-white shadow dark:bg-neutral-800" : "text-neutral-500"}`}
            >
              12 bln
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4">
          <div className="text-xs text-neutral-500">Total budget</div>
          <div className="mt-1 text-lg font-semibold">
            {rupiah(totalBudget)}
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="text-xs text-neutral-500">Total realisasi</div>
          <div
            className={`mt-1 text-lg font-semibold ${totalActual > totalBudget && totalBudget > 0 ? "text-red-500" : ""}`}
          >
            {rupiah(totalActual)}
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="text-xs text-neutral-500">Rata-rata/bulan</div>
          <div className="mt-1 text-lg font-semibold">{rupiah(avgSpend)}</div>
          <div className="text-xs text-neutral-400">
            {monthsOver} bln over budget
          </div>
        </div>
      </section>

      {/* Grouped bar: budget vs actual */}
      <section className="glass-card p-6">
        <div className="mb-4 flex items-center gap-4 text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-neutral-300" />{" "}
            Budget
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-neutral-900 dark:bg-white" />{" "}
            Realisasi
          </span>
        </div>
        <div className="flex items-end gap-2">
          {rows.map((r, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-32 w-full items-end justify-center gap-0.5">
                <div
                  className="w-1/2 rounded-t bg-neutral-300"
                  style={{
                    height:
                      r.budgetedExpense > 0
                        ? `max(${(r.budgetedExpense / maxBar) * 100}%, 3px)`
                        : "0%",
                  }}
                  title={`Budget ${rupiah(r.budgetedExpense)}`}
                />
                <div
                  className={`w-1/2 rounded-t ${r.actualExpense > r.budgetedExpense && r.budgetedExpense > 0 ? "bg-red-500" : "bg-neutral-900 dark:bg-white"}`}
                  style={{
                    height:
                      r.actualExpense > 0
                        ? `max(${(r.actualExpense / maxBar) * 100}%, 3px)`
                        : "0%",
                  }}
                  title={`Realisasi ${rupiah(r.actualExpense)}`}
                />
              </div>
              <span className="text-[10px] text-neutral-400">{r.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Tabel rincian per bulan */}
      <section className="glass-card p-6">
        <h2 className="mb-3 text-sm font-medium text-neutral-500">
          Rincian per Bulan
        </h2>
        <div className="grid grid-cols-[1fr_100px_100px_100px] gap-2 border-b border-neutral-100 pb-2 text-[11px] uppercase tracking-wide text-neutral-400 dark:border-white/5">
          <span>Bulan</span>
          <span className="text-right">Budget</span>
          <span className="text-right">Realisasi</span>
          <span className="text-right">Selisih</span>
        </div>
        <ul className="divide-y divide-neutral-100 text-sm dark:divide-white/5">
          {rows.map((r, i) => (
            <li
              key={i}
              className="grid grid-cols-[1fr_100px_100px_100px] gap-2 py-2"
            >
              <span>{r.label}</span>
              <span className="text-right tabular-nums text-neutral-500">
                {rupiahShort(r.budgetedExpense)}
              </span>
              <span className="text-right tabular-nums">
                {rupiahShort(r.actualExpense)}
              </span>
              <span
                className={`text-right tabular-nums ${r.variance < 0 ? "text-red-500" : "text-emerald-600"}`}
              >
                {r.variance < 0 ? "-" : ""}
                {rupiahShort(Math.abs(r.variance))}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
