import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/lib/telegram";
import { AFTER_PRAYER_REMINDER, getQuranReminder } from "@/lib/duas";

const pad = (n: number) => String(n).padStart(2, "0");

// Jalankan tiap 1 menit. Kirim reminder untuk aktivitas yang jatuh tempo
// dalam 15 menit terakhir & belum di-remind (window toleransi biar nggak
// gampang kelewat kalau cron telat/tiap beberapa menit). Semua waktu WIB.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(now);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hh = Number(parts.find((p) => p.type === "hour")!.value);
  const mm = Number(parts.find((p) => p.type === "minute")!.value);

  const nowMin = hh * 60 + mm;
  const lowMin = Math.max(0, nowMin - 15); // window 15 menit ke belakang
  const lowerStr = `${pad(Math.floor(lowMin / 60))}:${pad(lowMin % 60)}:00`;
  const upperStr = `${pad(hh)}:${pad(mm)}:59`;
  const currentTime = `${pad(hh)}:${pad(mm)}`;

  const { data: dueActivities, error } = await supabase
    .from("activities")
    .select("*")
    .eq("scheduled_date", today)
    .eq("status", "scheduled")
    .is("reminded_at", null)
    .gte("scheduled_time", lowerStr)
    .lte("scheduled_time", upperStr)
    .order("scheduled_time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Aktivitas berikutnya hari ini (jam > sekarang, belum selesai).
  const { data: nextActs } = await supabase
    .from("activities")
    .select("title, scheduled_time")
    .eq("scheduled_date", today)
    .gt("scheduled_time", `${currentTime}:59`)
    .eq("status", "scheduled")
    .order("scheduled_time", { ascending: true })
    .limit(1);

  const nextActivity = nextActs?.[0] ?? null;
  const nextLine = nextActivity
    ? `\n\n⏭️ Berikutnya: ${String(nextActivity.scheduled_time).slice(0, 5)} — ${nextActivity.title}`
    : `\n\n🎉 Ini aktivitas terakhir hari ini.`;

  for (const activity of dueActivities ?? []) {
    const timeLabel = String(activity.scheduled_time).slice(0, 5);
    let message = `⏰ *${timeLabel} — ${activity.title}*${nextLine}`;

    if (activity.category === "ibadah") {
      if (activity.title.startsWith("Sholat")) {
        message = `⏰ *${activity.title}*\n\n${AFTER_PRAYER_REMINDER}${nextLine}`;
      } else if (activity.title.startsWith("Baca Quran")) {
        message = `${getQuranReminder()}${nextLine}`;
      }
    }

    await sendTelegramMessage(message);
    await supabase
      .from("activities")
      .update({ reminded_at: now.toISOString() })
      .eq("id", activity.id);
  }

  return NextResponse.json({
    ok: true,
    reminded: dueActivities?.length ?? 0,
    currentTime,
    window: `${lowerStr}–${upperStr}`,
  });
}
