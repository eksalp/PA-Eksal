import { createClient } from "@/lib/supabase/server";
import { GoalManager } from "./goal-manager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GoalsPage() {
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

  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  const active = (goals ?? []).filter((g: any) => g.status !== "done");
  const done = (goals ?? []).filter((g: any) => g.status === "done");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
            Goals
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-3)" }}>
            {active.length} aktif · {done.length} selesai
          </p>
        </div>
      </div>

      <GoalManager userId={user.id} initialGoals={goals ?? []} />
    </div>
  );
}
