import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { BudgetManager } from "./budget-manager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
const MONTH_NAMES = [
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

export default async function BudgetPage({
  searchParams,
}: {
  searchParams?: { month?: string };
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

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(new Date());
  const [ty, tm] = today.split("-").map(Number);
  let y = ty,
    m = tm;
  if (searchParams?.month && /^\d{4}-\d{2}$/.test(searchParams.month)) {
    [y, m] = searchParams.month.split("-").map(Number);
  }
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const prevDate = new Date(Date.UTC(y, m - 2, 1));
  const nextDate = new Date(Date.UTC(y, m, 1));
  const prevYM = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, "0")}`;
  const nextYM = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, "0")}`;
  const isCurrentMonth = y === ty && m === tm;

  const [{ data: cats }, { data: budgets }, { data: txns }] = await Promise.all(
    [
      supabase
        .from("budget_categories")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order"),
      supabase
        .from("budgets")
        .select("*")
        .eq("user_id", user.id)
        .eq("month", start),
      supabase
        .from("transactions")
        .select("amount,category,type")
        .eq("user_id", user.id)
        .gte("transaction_date", start)
        .lte("transaction_date", end),
    ],
  );

  const budgetMap: Record<string, number> = {};
  (budgets ?? []).forEach((b: any) => {
    budgetMap[b.category_id] = Number(b.amount);
  });
  const actualMap: Record<string, number> = {};
  (txns ?? [])
    .filter((t: any) => t.type === "expense")
    .forEach((t: any) => {
      (cats ?? []).forEach((c: any) => {
        if (c.name.toLowerCase() === (t.category || "").toLowerCase()) {
          actualMap[c.id] = (actualMap[c.id] || 0) + Number(t.amount);
        }
      });
    });

  const catsWithData = (cats ?? []).map((c: any) => ({
    ...c,
    budgeted: budgetMap[c.id] || 0,
    actual: actualMap[c.id] || 0,
  }));

  const totalBudget = Object.values(budgetMap).reduce((s, v) => s + v, 0);
  const totalActual = (txns ?? [])
    .filter((t: any) => t.type === "expense")
    .reduce((s: number, t: any) => s + Number(t.amount), 0);
  const pct = totalBudget ? Math.round((totalActual / totalBudget) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
              Budget
            </h1>
            <p className="mt-0.5 text-sm" style={{ color: "var(--text-3)" }}>
              Zero-based budgeting
            </p>
          </div>
          <Link
            href="/budget/report"
            className="text-xs font-medium"
            style={{ color: "var(--brand-from)" }}
          >
            Tren 6 bulan →
          </Link>
        </div>

        {/* Month nav */}
        <div
          className="mt-4 flex items-center justify-between rounded-xl p-1"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
          }}
        >
          <Link
            href={`/budget?month=${prevYM}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors"
            style={{ color: "var(--text-2)" }}
          >
            ‹
          </Link>
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--text)" }}
          >
            {MONTH_NAMES[m - 1]} {y}{" "}
            {isCurrentMonth && (
              <span
                className="text-xs font-normal ml-1"
                style={{ color: "var(--brand-from)" }}
              >
                bulan ini
              </span>
            )}
          </span>
          <Link
            href={`/budget?month=${nextYM}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors"
            style={{ color: "var(--text-2)" }}
          >
            ›
          </Link>
        </div>

        {/* Summary bar */}
        {totalBudget > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs">
              <span style={{ color: "var(--text-3)" }}>
                Realisasi {rupiah(totalActual)}
              </span>
              <span
                className="font-semibold"
                style={{ color: pct > 100 ? "var(--red)" : "var(--green)" }}
              >
                {pct}% dari {rupiah(totalBudget)}
              </span>
            </div>
            <div className="progress-track">
              <div
                style={{
                  height: 6,
                  borderRadius: 99,
                  width: `${Math.min(100, pct)}%`,
                  background:
                    pct > 100
                      ? "var(--red)"
                      : "linear-gradient(90deg,#4F78FF,#7C5CFC)",
                  transition: "width .4s ease",
                }}
              />
            </div>
          </div>
        )}
      </div>

      <BudgetManager
        key={start}
        userId={user.id}
        month={start}
        categories={catsWithData}
      />
    </div>
  );
}
