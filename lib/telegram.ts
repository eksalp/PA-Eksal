// Helper untuk kirim notifikasi lewat Telegram Bot.
// Setup: lihat instruksi "Setup Telegram" di README.md.

export async function sendTelegramMessage(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("Telegram belum dikonfigurasi — lewati notifikasi.");
    return null;
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Gagal kirim notifikasi Telegram:", err);
    return null;
  }

  return res.json();
}
