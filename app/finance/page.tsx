import { createClient } from "@/lib/supabase/server";
import { NewTransactionForm } from "./new-transaction-form";

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export default async function FinancePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="glass-card p-6 text-sm text-neutral-500">Silakan login dulu.</div>;
  }

  const [{ data: accounts }, { data: transactions }, { data: assets }, { data: debts }] =
    await Promise.all([
      supabase.from("accounts").select("*").eq("user_id", user.id).eq("is_active", true),
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false })
        .limit(10),
      supabase.from("assets").select("*").eq("user_id", user.id),
      supabase.from("debts").select("*").eq("user_id", user.id).neq("status", "paid"),
    ]);

  const totalCash = accounts?.reduce((sum, a) => sum + Number(a.current_balance), 0) ?? 0;
  const totalAssets = assets?.reduce((sum, a) => sum + Number(a.estimated_value), 0) ?? 0;
  const totalUtang =
    debts?.filter((d) => d.direction === "utang").reduce((sum, d) => sum + Number(d.remaining_amount), 0) ?? 0;
  const totalPiutang =
    debts?.filter((d) => d.direction === "piutang").reduce((sum, d) => sum + Number(d.remaining_amount), 0) ?? 0;
  const netWorth = totalCash + totalAssets + totalPiutang - totalUtang;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Finance</h1>

      <div className="glass-card p-6">
        <div className="text-sm text-neutral-500">Perkiraan kekayaan bersih (net worth)</div>
        <div className="mt-1 text-2xl font-semibold">{formatIDR(netWorth)}</div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-neutral-500 sm:grid-cols-4">
          <div>Kas & rekening: {formatIDR(totalCash)}</div>
          <div>Aset: {formatIDR(totalAssets)}</div>
          <div>Piutang: {formatIDR(totalPiutang)}</div>
          <div>Utang: -{formatIDR(totalUtang)}</div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="mb-3 text-sm font-medium text-neutral-500">Akun</h2>
        <ul className="space-y-2">
          {accounts?.map((a) => (
            <li key={a.id} className="flex justify-between text-sm">
              <span>
                {a.name} <span className="text-xs text-neutral-400">({a.type})</span>
              </span>
              <span>{formatIDR(Number(a.current_balance))}</span>
            </li>
          ))}
          {(!accounts || accounts.length === 0) && (
            <p className="text-sm text-neutral-400">
              Belum ada akun. Tambahkan lewat Supabase Table Editor untuk sekarang.
            </p>
          )}
        </ul>
      </div>

      <NewTransactionForm userId={user.id} accounts={accounts ?? []} />

      <div className="glass-card p-6">
        <h2 className="mb-3 text-sm font-medium text-neutral-500">Transaksi terakhir</h2>
        <ul className="space-y-2">
          {transactions?.map((t) => (
            <li key={t.id} className="flex justify-between text-sm">
              <span>
                {t.note || t.category || t.type}{" "}
                <span className="text-xs text-neutral-400">{t.transaction_date}</span>
              </span>
              <span className={t.type === "expense" ? "text-red-500" : "text-green-600"}>
                {t.type === "expense" ? "-" : "+"}
                {formatIDR(Number(t.amount))}
              </span>
            </li>
          ))}
          {(!transactions || transactions.length === 0) && (
            <p className="text-sm text-neutral-400">Belum ada transaksi.</p>
          )}
        </ul>
      </div>

      <div className="glass-card p-6">
        <h2 className="mb-3 text-sm font-medium text-neutral-500">Utang & piutang aktif</h2>
        <ul className="space-y-2">
          {debts?.map((d) => (
            <li key={d.id} className="flex justify-between text-sm">
              <span>
                {d.direction === "utang" ? "Utang ke" : "Piutang dari"} {d.counterparty_name}
                {d.due_date && <span className="text-xs text-neutral-400"> · jatuh tempo {d.due_date}</span>}
              </span>
              <span className={d.direction === "utang" ? "text-red-500" : "text-green-600"}>
                {formatIDR(Number(d.remaining_amount))}
              </span>
            </li>
          ))}
          {(!debts || debts.length === 0) && (
            <p className="text-sm text-neutral-400">Tidak ada utang/piutang aktif.</p>
          )}
        </ul>
      </div>

      <div className="glass-card p-6">
        <h2 className="mb-3 text-sm font-medium text-neutral-500">Aset</h2>
        <ul className="space-y-2">
          {assets?.map((a) => (
            <li key={a.id} className="flex justify-between text-sm">
              <span>
                {a.name} <span className="text-xs text-neutral-400">({a.category})</span>
              </span>
              <span>{formatIDR(Number(a.estimated_value))}</span>
            </li>
          ))}
          {(!assets || assets.length === 0) && (
            <p className="text-sm text-neutral-400">Belum ada aset tercatat.</p>
          )}
        </ul>
      </div>
    </div>
  );
}
