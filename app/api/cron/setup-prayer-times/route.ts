import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { format } from "date-fns";

// Jalankan sekali tiap pagi (misal 00:05) lewat Vercel Cron.
// Mengambil jadwal sholat HARI INI dari Aladhan API berdasarkan lokasi,
// lalu membuat 5 activity (Subuh, Dzuhur, Ashar, Maghrib, Isya) di timeline.
//
// Kenapa fetch tiap hari, bukan hardcode jam: waktu sholat bergeser
// beberapa menit tiap hari mengikuti posisi matahari.

const PRAYER_NAMES: Record<string, string> = {
  Fajr: "Sholat Subuh",
  Dhuhr: "Sholat Dzuhur",
  Asr: "Sholat Ashar",
  Maghrib: "Sholat Maghrib",
  Isha: "Sholat Isya",
};

export async function GET(request: Request) {
  // Lindungi endpoint ini dengan secret sederhana (lihat README bagian cron)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = format(new Date(), "yyyy-MM-dd");

  // Default: Jakarta. Ganti city/country sesuai lokasimu, atau pakai
  // latitude/longitude jika mau lebih presisi (lihat dokumentasi Aladhan).
  const city = process.env.PRAYER_CITY ?? "Jakarta";
  const country = process.env.PRAYER_COUNTRY ?? "Indonesia";

  const res = await fetch(
    `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(
      city
    )}&country=${encodeURIComponent(country)}&method=20`
    // method=20 = Kemenag RI, standar yang umum dipakai di Indonesia
  );
  const data = await res.json();
  const timings = data?.data?.timings;

  if (!timings) {
    return NextResponse.json({ error: "Gagal ambil jadwal sholat" }, { status: 500 });
  }

  // TODO v2: loop per user (kalau sudah multi-user). v1 masih single-user,
  // jadi kita perlu tahu user_id-nya — ambil dari env atau user pertama di DB.
  const userId = process.env.SINGLE_USER_ID;
  if (!userId) {
    return NextResponse.json({ error: "SINGLE_USER_ID belum diset di env" }, { status: 500 });
  }

  const rows = Object.entries(PRAYER_NAMES).map(([key, title]) => ({
    user_id: userId,
    title,
    category: "ibadah",
    scheduled_date: today,
    scheduled_time: timings[key], // format "HH:mm"
    status: "scheduled" as const,
    source: "manual" as const,
  }));

  // Slot "Baca Quran" ditaruh 15 menit setelah tiap sholat — waktu yang umum
  // dipakai untuk tilawah singkat sebelum lanjut aktivitas lain.
  const quranRows = Object.entries(PRAYER_NAMES).map(([key, prayerTitle]) => {
    const [h, m] = timings[key].split(":").map(Number);
    const totalMinutes = h * 60 + m + 15;
    const hh = String(Math.floor(totalMinutes / 60) % 24).padStart(2, "0");
    const mm = String(totalMinutes % 60).padStart(2, "0");
    return {
      user_id: userId,
      title: `Baca Quran (setelah ${prayerTitle.replace("Sholat ", "")})`,
      category: "ibadah",
      scheduled_date: today,
      scheduled_time: `${hh}:${mm}`,
      status: "scheduled" as const,
      source: "manual" as const,
    };
  });

  const allRows = [...rows, ...quranRows];

  // Hapus dulu jadwal sholat lama hari ini (kalau cron ini dipanggil ulang),
  // supaya tidak dobel.
  await supabase
    .from("activities")
    .delete()
    .eq("user_id", userId)
    .eq("scheduled_date", today)
    .eq("category", "ibadah");

  const { error } = await supabase.from("activities").insert(allRows);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, timings });
}
