import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { BudgetManager } from "./budget-manager";

function monthRange(monthStr: string) {
  const [y, m] = monthStr.split("-").map(Number);
  const start = `${monthStr}-01`;
  const nextM = m === 12 ? 1 : m + 1;
  const nextY = m === 12 ? y + 1 : y;
  const end = `${nextY}-${String(nextM).padStart(2, "0")}-01`;
  return { start, end };
}

function shiftMonth(monthStr: string, delta: number) {
  const [y, m] = monthStr.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

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

export default async function BudgetPage({
  searchParams,
}: {
  searchParams?: { month?: string };
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

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = searchParams?.month || defaultMonth;
  const { start, end } = monthRange(month);

  const [{ data: cats }, { data: budgetRows }, { data: txns }] =
    await Promise.all([
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
        .select("category, type, amount, transaction_date")
        .eq("user_id", user.id)
        .gte("transaction_date", start)
        .lt("transaction_date", end),
    ]);

  const budgetMap: Record<string, number> = {};
  (budgetRows ?? []).forEach(
    (b: any) => (budgetMap[b.category_id] = Number(b.amount)),
  );

  const actualMap: Record<string, number> = {};
  (txns ?? []).forEach((t: any) => {
    const key = `${(t.category || "").toLowerCase()}|${t.type}`;
    actualMap[key] = (actualMap[key] || 0) + Number(t.amount);
  });

  const catsWithData = (cats ?? []).map((c: any) => {
    const type = c.group_type === "income" ? "income" : "expense";
    return {
      id: c.id,
      name: c.name,
      group_type: c.group_type,
      due_date: c.due_date,
      budgeted: budgetMap[c.id] || 0,
      actual: actualMap[`${c.name.toLowerCase()}|${type}`] || 0,
    };
  });

  const [y, m] = month.split("-").map(Number);

  return (
    <div className="space-y-6">
      <section className="glass-card p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Budget</h1>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/budget/report"
              className="text-xs text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            >
              Tren →
            </Link>
            <Link
              href={`/budget?month=${shiftMonth(month, -1)}`}
              className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            >
              ‹
            </Link>
            <span className="min-w-[130px] text-center font-medium">
              {MONTH_LABEL[m - 1]} {y}
            </span>
            <Link
              href={`/budget?month=${shiftMonth(month, 1)}`}
              className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            >
              ›
            </Link>
          </div>
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          Anggarkan tiap kategori, lalu bandingkan dengan realisasinya.
        </p>
      </section>

      <BudgetManager userId={user.id} month={start} categories={catsWithData} />
    </div>
  );
}
