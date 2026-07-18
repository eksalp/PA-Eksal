import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { NewActivityForm } from "./new-activity-form";

export default async function ActivitiesPage() {
  const supabase = createClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="glass-card p-6 text-sm text-neutral-500">Silakan login dulu.</div>;
  }

  const { data: activities } = await supabase
    .from("activities")
    .select("*")
    .eq("user_id", user.id)
    .eq("scheduled_date", today)
    .order("scheduled_time", { ascending: true, nullsFirst: false });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Timeline Hari Ini</h1>

      <NewActivityForm userId={user.id} scheduledDate={today} />

      <ul className="space-y-2">
        {activities?.map((a) => (
          <li key={a.id} className="glass-card flex items-center justify-between p-4 text-sm">
            <div>
              <span className="font-medium">{a.title}</span>
              {a.scheduled_time && (
                <span className="ml-2 text-neutral-400">{a.scheduled_time.slice(0, 5)}</span>
              )}
              {a.category && (
                <span className="ml-2 rounded-full bg-neutral-200 px-2 py-0.5 text-xs dark:bg-white/10">
                  {a.category}
                </span>
              )}
            </div>
            <span className="text-xs uppercase text-neutral-400">{a.status}</span>
          </li>
        ))}
        {(!activities || activities.length === 0) && (
          <p className="text-sm text-neutral-400">Belum ada aktivitas. Tambahkan di atas.</p>
        )}
      </ul>
    </div>
  );
}
