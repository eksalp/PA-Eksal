import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const pad = (n: number) => String(n).padStart(2, "0");
const jakartaToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date(),
  );

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
const WEEK = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function shiftMonth(monthStr: string, delta: number) {
  const [y, m] = monthStr.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

export default async function NoSpendPage({
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

  const today = jakartaToday();
  const nowMonth = today.slice(0, 7);
  const month = searchParams?.month || nowMonth;
  const [y, m] = month.split("-").map(Number);

  const monthStart = `${month}-01`;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const monthEnd = `${month}-${pad(daysInMonth)}`;

  const [{ data: txns }, { data: firstTxn }] = await Promise.all([
    supabase
      .from("transactions")
      .select("transaction_date")
      .eq("user_id", user.id)
      .eq("type", "expense")
      .gte("transaction_date", monthStart)
      .lte("transaction_date", monthEnd),
    supabase
      .from("transactions")
      .select("transaction_date")
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: true })
      .limit(1),
  ]);

  const spentDays = new Set(
    (txns ?? []).map((t: any) => String(t.transaction_date).slice(0, 10)),
  );
  const trackStart = firstTxn?.[0]?.transaction_date
    ? String(firstTxn[0].transaction_date).slice(0, 10)
    : today;

  type Cell = {
    day: number;
    date: string;
    status: "nospend" | "spent" | "future" | "nodata";
  };
  const cells: Cell[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${month}-${pad(d)}`;
    let status: Cell["status"];
    if (date > today) status = "future";
    else if (date < trackStart) status = "nodata";
    else if (spentDays.has(date)) status = "spent";
    else status = "nospend";
    cells.push({ day: d, date, status });
  }

  const eligible = cells.filter(
    (c) => c.status === "nospend" || c.status === "spent",
  );
  const noSpendCount = eligible.filter((c) => c.status === "nospend").length;
  const spentCount = eligible.filter((c) => c.status === "spent").length;

  // current streak: dari hari ini/terakhir eligible mundur selama nospend
  let currentStreak = 0;
  for (let i = eligible.length - 1; i >= 0; i--) {
    if (eligible[i].status === "nospend") currentStreak++;
    else break;
  }
  // longest streak in month
  let longest = 0;
  let run = 0;
  for (const c of eligible) {
    if (c.status === "nospend") {
      run++;
      longest = Math.max(longest, run);
    } else run = 0;
  }

  const firstWeekdayMon = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;

  return (
    <div className="space-y-6">
      <section className="glass-card p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">No Spend Day</h1>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href={`/no-spend?month=${shiftMonth(month, -1)}`}
              className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            >
              ‹
            </Link>
            <span className="min-w-[120px] text-center font-medium">
              {MONTH_LABEL[m - 1]} {y}
            </span>
            <Link
              href={`/no-spend?month=${shiftMonth(month, 1)}`}
              className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            >
              ›
            </Link>
          </div>
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          Hari tanpa pengeluaran, otomatis dari transaksimu.
        </p>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-semibold text-emerald-600">
            {noSpendCount}
          </div>
          <div className="text-xs text-neutral-500">Hari hemat</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-semibold">{currentStreak}</div>
          <div className="text-xs text-neutral-500">Streak sekarang</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-semibold">{longest}</div>
          <div className="text-xs text-neutral-500">Streak terbaik</div>
        </div>
      </section>

      <section className="glass-card p-6">
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] text-neutral-400">
          {WEEK.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstWeekdayMon }).map((_, i) => (
            <div key={`b${i}`} />
          ))}
          {cells.map((c) => {
            const isToday = c.date === today;
            const base =
              "flex aspect-square items-center justify-center rounded-lg text-xs";
            const style =
              c.status === "nospend"
                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                : c.status === "spent"
                  ? "bg-red-500/10 text-red-500"
                  : c.status === "future"
                    ? "text-neutral-300 dark:text-neutral-600"
                    : "text-neutral-300 dark:text-neutral-600";
            return (
              <div
                key={c.date}
                className={`${base} ${style} ${isToday ? "ring-2 ring-neutral-900 dark:ring-white" : ""}`}
                title={c.date}
              >
                {c.day}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex gap-4 text-xs text-neutral-400">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-emerald-500/20" />{" "}
            Hemat
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-red-500/10" /> Ada
            pengeluaran
          </span>
        </div>
      </section>

      <p className="px-2 text-xs text-neutral-400">
        Catatan: dihitung otomatis dari transaksi. Hari sebelum transaksi
        pertamamu ({trackStart}) tidak dihitung.
      </p>
    </div>
  );
}
