import { NextResponse } from "next/server";
import { sendTelegramMessage } from "@/lib/telegram";

// Buka http://localhost:3000/api/telegram-test di browser untuk tes
// apakah bot Telegram-mu sudah tersambung dengan benar.
export async function GET() {
  const result = await sendTelegramMessage(
    "🎉 Halo dari AI Life OS! Koneksi Telegram berhasil."
  );

  if (!result) {
    return NextResponse.json(
      { ok: false, message: "Gagal kirim. Cek TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID di .env.local" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, message: "Notifikasi terkirim, cek Telegram-mu." });
}
