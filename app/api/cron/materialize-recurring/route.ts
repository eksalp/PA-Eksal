import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { format } from "date-fns";

// Jalankan tiap pagi (00:05) bareng cron jadwal sholat. Untuk tiap
// recurring_activities aktif yang cocok dengan hari ini (days_of_week),
// buat satu baris di `activities` untuk hari ini — kalau belum ada.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const dow = today.getDay(); // 0=Minggu ... 6=Sabtu

  const { data: templates, error } = await supabase
    .from("recurring_activities")
    .select("*")
    .eq("is_active", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const dueTemplates = (templates ?? []).filter(
    (t) => t.days_of_week === null || t.days_of_week.includes(dow)
  );

  let created = 0;
  for (const template of dueTemplates) {
    // Cegah dobel: cek apakah sudah ada activity dari template ini hari ini
    const { data: existing } = await supabase
      .from("activities")
      .select("id")
      .eq("recurring_activity_id", template.id)
      .eq("scheduled_date", todayStr)
      .maybeSingle();

    if (existing) continue;

    await supabase.from("activities").insert({
      user_id: template.user_id,
      title: template.title,
      category: template.category,
      scheduled_date: todayStr,
      scheduled_time: template.scheduled_time,
      status: "scheduled",
      source: "recurring",
      recurring_activity_id: template.id,
    });
    created++;
  }

  return NextResponse.json({ ok: true, created });
}
