import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTelegramMessage } from "@/lib/telegram";
import { format } from "date-fns";

// Panggil endpoint ini lewat cron job (contoh: Supabase Edge Function + pg_cron,
// atau Vercel Cron) tiap malam jam 23:00 waktu user.
//
// v1: satu panggilan OpenAI sederhana, TIDAK ada reasoning multi-sumber
// (itu butuh data Health/Strava yang belum disinkronkan di v1).
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = format(new Date(), "yyyy-MM-dd");

  const { data: activities } = await supabase
    .from("activities")
    .select("title, status, category")
    .eq("user_id", user.id)
    .eq("scheduled_date", today);

  const { data: habitLogs } = await supabase
    .from("habit_logs")
    .select("habit_id, completed_count, habits(name, target_per_period)")
    .eq("user_id", user.id)
    .eq("log_date", today);

  const rawInput = { activities, habitLogs };

  const completedCount = activities?.filter((a) => a.status === "completed").length ?? 0;
  const skippedCount = activities?.filter((a) => a.status === "skipped").length ?? 0;

  const prompt = `Kamu adalah asisten AI Life OS. Berdasarkan data hari ini, buat review singkat dalam Bahasa Indonesia.

Aktivitas selesai: ${completedCount}
Aktivitas terlewat: ${skippedCount}
Detail aktivitas: ${JSON.stringify(activities)}
Habit hari ini: ${JSON.stringify(habitLogs)}

Balas HANYA dalam format JSON, tanpa markdown, dengan struktur persis:
{"summary": "ringkasan 2-3 kalimat", "win": "satu hal yang berhasil", "missed": "satu hal yang terlewat atau null"}`;

  // Menggunakan OpenAI API sesuai stack yang dipilih di brief.
  const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });

  const aiData = await aiResponse.json();
  const text = aiData.choices?.[0]?.message?.content ?? "";

  let parsed: { summary: string; win: string; missed: string | null };
  try {
    parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return NextResponse.json({ error: "AI response parsing failed" }, { status: 500 });
  }

  const { data: review, error } = await supabase
    .from("daily_reviews")
    .upsert(
      {
        user_id: user.id,
        review_date: today,
        summary: parsed.summary,
        win: parsed.win,
        missed: parsed.missed,
        raw_input: rawInput,
      },
      { onConflict: "user_id,review_date" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await sendTelegramMessage(
    `*AI Daily Review — ${today}*\n\n${parsed.summary}\n\n✅ Win: ${parsed.win}\n${
      parsed.missed ? `⚠️ Terlewat: ${parsed.missed}` : ""
    }`
  );

  return NextResponse.json({ review });
}
