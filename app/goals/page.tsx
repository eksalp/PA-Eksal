import { createClient } from "@/lib/supabase/server";
import { GoalManager, type Goal } from "./goal-manager";

export default async function GoalsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="glass-card p-6 text-sm text-neutral-500">
        Silakan login dulu untuk melihat goals-mu.
      </div>
    );
  }

  // Tabel "goals" belum ada di types/database.ts hasil-generate, jadi kita
  // pakai cast + tipe lokal Goal supaya nggak perlu regenerate tipe.
  const { data } = await (supabase as any)
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const goals = (data ?? []) as Goal[];

  return (
    <div className="space-y-6">
      <section className="glass-card p-6">
        <h1 className="text-xl font-semibold">Goals</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Target jangka panjang dengan progress terukur.
        </p>
      </section>

      <GoalManager initialGoals={goals} userId={user.id} />
    </div>
  );
}
