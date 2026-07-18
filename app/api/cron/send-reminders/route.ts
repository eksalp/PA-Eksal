import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/lib/telegram";
import { AFTER_PRAYER_REMINDER, getQuranReminder } from "@/lib/duas";
import { format } from "date-fns";

// Jalankan tiap 1-5 menit lewat Vercel Cron. Cek aktivitas yang jamnya
// "sekarang" (dalam window beberapa menit) dan belum di-remind, lalu
// kirim notifikasi Telegram.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const currentTime = format(now, "HH:mm");

  // Window toleransi: aktivitas dengan jam sama persis "HH:mm" saat cron ini jalan.
  // Kalau cron cuma jalan tiap 5 menit, aktivitas dengan menit ganjil bisa lewat —
  // untuk hasil presisi, set cron tiap 1 menit (lihat README).
  const { data: dueActivities, error } = await supabase
    .from("activities")
    .select("*")
    .eq("scheduled_date", today)
    .eq("scheduled_time", `${currentTime}:00`)
    .eq("status", "scheduled")
    .is("reminded_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  for (const activity of dueActivities ?? []) {
    let message = `⏰ Waktunya: *${activity.title}*`;

    if (activity.category === "ibadah") {
      if (activity.title.startsWith("Sholat")) {
        message = `⏰ *${activity.title}*\n\n${AFTER_PRAYER_REMINDER}`;
      } else if (activity.title.startsWith("Baca Quran")) {
        message = getQuranReminder();
      }
    }

    await sendTelegramMessage(message);
    await supabase
      .from("activities")
      .update({ reminded_at: now.toISOString() })
      .eq("id", activity.id);
  }

  return NextResponse.json({ ok: true, reminded: dueActivities?.length ?? 0 });
}
