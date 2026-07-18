import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/lib/telegram";
import { format } from "date-fns";

// Jalankan tiap pagi setelah materialize-recurring (misal 06:00). Cek
// forecast cuaca (pakai Open-Meteo, gratis tanpa API key) untuk hari ini,
// lalu untuk tiap aktivitas berkategori 'olahraga' yang di luar ruangan,
// kirim SARAN kalau kemungkinan hujan tinggi di jam tersebut.
//
// Ini sengaja hanya MENYARANKAN, tidak auto-reschedule — user tetap yang
// putuskan (lihat kolom reschedule_reason di schema untuk log kalau nanti
// mau dibuat auto-reschedule di v3).

const OUTDOOR_KEYWORDS = ["lari", "renang", "sepeda", "jogging", "olahraga outdoor"];

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const lat = process.env.WEATHER_LAT ?? "-6.2088"; // default Jakarta
  const lon = process.env.WEATHER_LON ?? "106.8456";

  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation_probability&timezone=Asia%2FJakarta`
  );
  const weather = await weatherRes.json();
  const hourlyTimes: string[] = weather?.hourly?.time ?? [];
  const hourlyRainChance: number[] = weather?.hourly?.precipitation_probability ?? [];

  const { data: activities } = await supabase
    .from("activities")
    .select("*")
    .eq("scheduled_date", today)
    .eq("status", "scheduled");

  const outdoorActivities = (activities ?? []).filter((a) =>
    OUTDOOR_KEYWORDS.some((kw) => a.title.toLowerCase().includes(kw))
  );

  const suggestions: string[] = [];

  for (const activity of outdoorActivities) {
    if (!activity.scheduled_time) continue;
    const targetHourStr = `${today}T${activity.scheduled_time.slice(0, 2)}:00`;
    const idx = hourlyTimes.findIndex((t) => t.startsWith(targetHourStr));
    if (idx === -1) continue;

    const rainChance = hourlyRainChance[idx];
    if (rainChance >= 60) {
      suggestions.push(
        `🌧️ *${activity.title}* jam ${activity.scheduled_time.slice(
          0,
          5
        )} — kemungkinan hujan ${rainChance}%. Pertimbangkan pindah indoor atau geser jadwal.`
      );
    }
  }

  if (suggestions.length > 0) {
    await sendTelegramMessage(suggestions.join("\n\n"));
  }

  return NextResponse.json({ ok: true, suggestions: suggestions.length });
}
