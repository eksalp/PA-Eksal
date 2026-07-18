// Dzikir singkat & pengingat setelah tiap sholat.
// Teks-teks ini adalah dzikir/doa umum dalam Islam (bukan hak cipta modern),
// jadi aman disertakan lengkap.

export const AFTER_PRAYER_REMINDER =
  "Setelah sholat, luangkan waktu sebentar:\n" +
  "• Istighfar 3x\n" +
  "• Dzikir singkat (Subhanallah, Alhamdulillah, Allahu Akbar)\n" +
  "• Baca beberapa ayat Al-Quran 📖";

export const QURAN_REMINDER_MESSAGES = [
  "📖 Waktunya tilawah. Sedikit tapi rutin lebih baik daripada banyak tapi jarang.",
  "📖 Yuk luangkan beberapa menit baca Quran sebelum lanjut aktivitas.",
  "📖 Satu halaman hari ini, insyaallah jadi kebiasaan yang ringan tapi berat timbangannya.",
];

export function getQuranReminder(): string {
  const i = Math.floor(Math.random() * QURAN_REMINDER_MESSAGES.length);
  return QURAN_REMINDER_MESSAGES[i];
}

export const FASTING_REMINDERS = {
  ramadan_sahur:
    "🌙 Waktunya sahur — jangan sampai terlewat. Jangan lupa niat puasa Ramadan.",
  ramadan_iftar: "🌙 Sudah masuk waktu Maghrib — saatnya berbuka. Selamat berbuka puasa!",
  senin_kamis:
    "🕌 Besok Senin/Kamis — mau lanjutkan puasa sunnah? Jangan lupa niat dari malam ini.",
  ayyamul_bidh:
    "🕌 Besok tanggal 13/14/15 Hijriah (Ayyamul Bidh) — waktu yang baik untuk puasa sunnah.",
};
