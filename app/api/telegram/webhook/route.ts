import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/lib/telegram";
import { format } from "date-fns";

// Set webhook Telegram ke URL ini (lihat README "Setup Chat 2 Arah").
// User cukup chat bot: "tambahin lari sore jam 5" atau
// "renang tiap sabtu jam 7 pagi" — AI akan parse jadi activity
// (sekali) atau recurring_activity (berulang seterusnya).

interface ParsedRequest {
  intent: "add_once" | "add_recurring" | "unclear";
  title: string;
  category: string | null;
  time: string | null; // "HH:mm"
  date: string | null; // "yyyy-MM-dd", untuk add_once. null = hari ini
  days_of_week: number[] | null; // untuk add_recurring. null = tiap hari
  reply_message: string; // konfirmasi singkat untuk dibalas ke user
}

async function parseWithAI(text: string, today: string): Promise<ParsedRequest> {
  const prompt = `Kamu adalah parser untuk asisten pribadi. User mengirim pesan berikut lewat Telegram untuk menambah kegiatan ke jadwalnya:

"${text}"

Tanggal hari ini: ${today} (format yyyy-MM-dd). Hari ini adalah ${format(
    new Date(today),
    "EEEE"
  )}.

Tentukan apakah ini permintaan SEKALI (add_once) atau BERULANG/SETERUSNYA (add_recurring, contoh kata kunci: "tiap", "setiap", "rutin", "seterusnya"). Kalau berulang, tentukan days_of_week (0=Minggu,1=Senin,...,6=Sabtu; null kalau tiap hari).

Balas HANYA JSON dengan struktur persis:
{"intent": "add_once" | "add_recurring" | "unclear", "title": "...", "category": "olahraga|ibadah|kerja|personal|null", "time": "HH:mm atau null", "date": "yyyy-MM-dd atau null", "days_of_week": [angka] atau null, "reply_message": "konfirmasi singkat dalam Bahasa Indonesia santai"}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
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
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(raw);
}

export async function POST(request: Request) {
  const body = await request.json();
  const text: string | undefined = body?.message?.text;
  const chatId: number | undefined = body?.message?.chat?.id;

  if (!text || !chatId) {
    return NextResponse.json({ ok: true }); // abaikan update non-teks
  }

  // Keamanan sederhana: hanya proses pesan dari chat ID yang terdaftar.
  if (String(chatId) !== process.env.TELEGRAM_CHAT_ID) {
    return NextResponse.json({ ok: true });
  }

  const userId = process.env.SINGLE_USER_ID;
  if (!userId) {
    await sendTelegramMessage("SINGLE_USER_ID belum diset di server.");
    return NextResponse.json({ ok: true });
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const supabase = createAdminClient();

  let parsed: ParsedRequest;
  try {
    parsed = await parseWithAI(text, today);
  } catch {
    await sendTelegramMessage("Maaf, gagal memproses pesanmu. Coba lagi dengan kalimat lebih jelas.");
    return NextResponse.json({ ok: true });
  }

  if (parsed.intent === "unclear") {
    await sendTelegramMessage(
      parsed.reply_message || "Kurang jelas maksudnya. Coba sebutkan kegiatan + jam, contoh: 'tambahin renang jam 7 pagi'."
    );
    return NextResponse.json({ ok: true });
  }

  if (parsed.intent === "add_once") {
    await supabase.from("activities").insert({
      user_id: userId,
      title: parsed.title,
      category: parsed.category,
      scheduled_date: parsed.date || today,
      scheduled_time: parsed.time,
      status: "scheduled",
      source: "telegram",
    });
  } else if (parsed.intent === "add_recurring") {
    const { data: template } = await supabase
      .from("recurring_activities")
      .insert({
        user_id: userId,
        title: parsed.title,
        category: parsed.category,
        scheduled_time: parsed.time,
        days_of_week: parsed.days_of_week,
      })
      .select()
      .single();

    // Kalau template ini juga berlaku hari ini, langsung materialize
    // supaya tidak perlu nunggu cron besok pagi.
    const dow = new Date().getDay();
    if (template && (parsed.days_of_week === null || parsed.days_of_week.includes(dow))) {
      await supabase.from("activities").insert({
        user_id: userId,
        title: parsed.title,
        category: parsed.category,
        scheduled_date: today,
        scheduled_time: parsed.time,
        status: "scheduled",
        source: "recurring",
        recurring_activity_id: template.id,
      });
    }
  }

  await sendTelegramMessage(parsed.reply_message || "Sudah ditambahkan ✅");
  return NextResponse.json({ ok: true });
}
