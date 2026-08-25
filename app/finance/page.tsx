import { createClient } from "@/lib/supabase/server";
import { NewTransactionForm } from "./new-transaction-form";
import { TransactionList } from "./transaction-list";
import { AccountManager } from "./account-manager";
import { AssetManager } from "./asset-manager";
import { DebtManager } from "./debt-manager";
import { FinanceOverview } from "./finance-overview";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FinancePage() {
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

  const uid = user.id;
  const [
    { data: accounts },
    { data: categories },
    { data: txns },
    { data: assets },
    { data: debts },
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .eq("user_id", uid)
      .eq("is_active", true)
      .order("created_at"),
    supabase
      .from("budget_categories")
      .select("id, name, group_type")
      .eq("user_id", uid)
      .order("sort_order"),
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", uid)
      .order("transaction_date", { ascending: false })
      .limit(50),
    supabase
      .from("assets")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false }),
    // Ambil SEMUA debts (aktif + lunas) untuk akumulasi all-time
    supabase
      .from("debts")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false }),
  ]);

  const accs = accounts ?? [];
  const allDebts = debts ?? [];

  const totalCash = accs.reduce(
    (s: number, a: any) => s + Number(a.current_balance),
    0,
  );
  const totalAssets = (assets ?? []).reduce(
    (s: number, a: any) => s + Number(a.estimated_value),
    0,
  );

  // Aktif saja (untuk net worth dan overview utama)
  const totalUtang = allDebts
    .filter((d: any) => d.direction === "utang" && d.status !== "paid")
    .reduce((s: number, d: any) => s + Number(d.remaining_amount), 0);
  const totalPiutang = allDebts
    .filter((d: any) => d.direction === "piutang" && d.status !== "paid")
    .reduce((s: number, d: any) => s + Number(d.remaining_amount), 0);

  // All-time: pakai original_amount (jumlah asli sebelum dilunasi)
  const totalUtangAllTime = allDebts
    .filter((d: any) => d.direction === "utang")
    .reduce((s: number, d: any) => s + Number(d.original_amount), 0);
  const totalPiutangAllTime = allDebts
    .filter((d: any) => d.direction === "piutang")
    .reduce((s: number, d: any) => s + Number(d.original_amount), 0);

  const netWorth = totalCash + totalAssets + totalPiutang - totalUtang;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
        Keuangan
      </h1>

      <FinanceOverview
        netWorth={netWorth}
        totalCash={totalCash}
        totalAssets={totalAssets}
        totalPiutang={totalPiutang}
        totalUtang={totalUtang}
        totalPiutangAllTime={totalPiutangAllTime}
        totalUtangAllTime={totalUtangAllTime}
        accounts={accs}
      />

      <div className="card p-5">
        <p className="mb-4 font-semibold" style={{ color: "var(--text)" }}>
          Catat Transaksi
        </p>
        <NewTransactionForm
          userId={uid}
          accounts={accs}
          categories={categories ?? []}
        />
      </div>

      <div className="card p-5">
        <p className="mb-4 font-semibold" style={{ color: "var(--text)" }}>
          Riwayat Transaksi
        </p>
        <TransactionList
          transactions={txns ?? []}
          categories={categories ?? []}
        />
      </div>

      <div className="card p-5">
        <p className="mb-4 font-semibold" style={{ color: "var(--text)" }}>
          Kelola Rekening
        </p>
        <AccountManager userId={uid} accounts={accs} />
      </div>

      <div className="card p-5">
        <p className="mb-4 font-semibold" style={{ color: "var(--text)" }}>
          Aset
        </p>
        <AssetManager
          userId={uid}
          accounts={accs}
          assets={assets ?? []}
          categories={categories ?? []}
        />
      </div>

      <div className="card p-5">
        <p className="mb-4 font-semibold" style={{ color: "var(--text)" }}>
          Utang & Piutang
        </p>
        <DebtManager userId={uid} accounts={accs} debts={allDebts} />
      </div>
    </div>
  );
}
