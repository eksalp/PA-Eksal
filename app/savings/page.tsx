import { createClient } from "@/lib/supabase/server";
import { SavingsManager } from "./savings-manager";

const idr = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

export default async function SavingsPage() {
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

  const { data: savings } = await supabase
    .from("savings_goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const list = savings ?? [];
  const totalSaved = list.reduce(
    (s: number, g: any) => s + Number(g.saved_amount),
    0,
  );
  const totalTarget = list.reduce(
    (s: number, g: any) => s + Number(g.target_amount),
    0,
  );
  const totalLeft = Math.max(0, totalTarget - totalSaved);

  return (
    <div className="space-y-6">
      <section className="glass-card p-6">
        <h1 className="text-xl font-semibold">Tabungan</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Target nabung & progress.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xs text-neutral-500">Terkumpul</div>
            <div className="mt-1 text-sm font-semibold text-emerald-600 sm:text-lg">
              {idr(totalSaved)}
            </div>
          </div>
          <div>
            <div className="text-xs text-neutral-500">Total target</div>
            <div className="mt-1 text-sm font-semibold sm:text-lg">
              {idr(totalTarget)}
            </div>
          </div>
          <div>
            <div className="text-xs text-neutral-500">Sisa</div>
            <div className="mt-1 text-sm font-semibold sm:text-lg">
              {idr(totalLeft)}
            </div>
          </div>
        </div>
      </section>

      <SavingsManager userId={user.id} savings={list} />
    </div>
  );
}
