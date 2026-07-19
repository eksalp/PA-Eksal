import { createClient } from "@/lib/supabase/server";
import { NewTransactionForm } from "./new-transaction-form";
import { TransactionList } from "./transaction-list";
import { AccountManager } from "./account-manager";
import { AssetManager } from "./asset-manager";
import { DebtManager } from "./debt-manager";

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function FinancePage() {
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

  const [
    { data: accounts },
    { data: transactions },
    { data: assets },
    { data: debts },
    { data: categories },
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at"),
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false })
      .limit(15),
    supabase
      .from("assets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at"),
    supabase
      .from("debts")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "paid")
      .order("created_at"),
    supabase
      .from("budget_categories")
      .select("id, name, group_type")
      .eq("user_id", user.id)
      .order("sort_order"),
  ]);

  const acc = accounts ?? [];
  const totalCash = acc.reduce(
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
  const netWorth = totalCash + totalAssets + totalPiutang - totalUtang;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Finance</h1>

      <div className="glass-card p-6">
        <div className="text-sm text-neutral-500">
          Perkiraan kekayaan bersih (net worth)
        </div>
        <div className="mt-1 text-2xl font-semibold">{formatIDR(netWorth)}</div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-neutral-500 sm:grid-cols-4">
          <div>Kas &amp; rekening: {formatIDR(totalCash)}</div>
          <div>Aset: {formatIDR(totalAssets)}</div>
          <div>Piutang: {formatIDR(totalPiutang)}</div>
          <div>Utang: -{formatIDR(totalUtang)}</div>
        </div>
      </div>

      <AccountManager userId={user.id} accounts={acc} />

      <NewTransactionForm
        userId={user.id}
        accounts={acc}
        categories={categories ?? []}
      />

      <TransactionList
        transactions={transactions ?? []}
        categories={categories ?? []}
      />

      <DebtManager userId={user.id} debts={debts ?? []} />

      <AssetManager userId={user.id} assets={assets ?? []} />
    </div>
  );
}
