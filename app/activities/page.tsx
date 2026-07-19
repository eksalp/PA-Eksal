import { createClient } from "@/lib/supabase/server";
import { NewActivityForm } from "./new-activity-form";
import { ActivityItem } from "./activity-item";

// Waktu WIB — server Vercel jalan di UTC.
const jakartaDate = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date(),
  );
const jakartaLabel = () =>
  new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

export default async function ActivitiesPage() {
  const supabase = createClient() as any;
  const today = jakartaDate();

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

  const { data: activities } = await supabase
    .from("activities")
    .select("*")
    .eq("user_id", user.id)
    .eq("scheduled_date", today)
    .order("scheduled_time", { ascending: true, nullsFirst: false });

  const acts = activities ?? [];
  const doneCount = acts.filter((a: any) => a.status === "completed").length;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Timeline</h1>
        <span className="text-sm text-neutral-400">
          {doneCount}/{acts.length} selesai · {jakartaLabel()}
        </span>
      </div>

      <NewActivityForm userId={user.id} scheduledDate={today} />

      <ul className="space-y-2">
        {acts.map((a: any) => (
          <ActivityItem key={a.id} activity={a} />
        ))}
        {acts.length === 0 && (
          <p className="text-sm text-neutral-400">
            Belum ada aktivitas. Tambahkan di atas.
          </p>
        )}
      </ul>
    </div>
  );
}
