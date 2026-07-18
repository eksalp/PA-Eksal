import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/lib/telegram";
import { FASTING_REMINDERS } from "@/lib/duas";
import { format, addDays } from "date-fns";

// Jalankan sekali tiap malam (misal jam 20:00) — cek tanggal Hijriah BESOK
// dan kirim reminder puasa sunnah/Ramadan kalau relevan. Dijalankan malam
// hari supaya reminder-nya sampai sebelum waktu niat puasa (sebelum Subuh).
//
// Kenapa pakai API, bukan hardcode tanggal: kalender Hijriah tidak punya
// jumlah hari tetap per bulan (29 atau 30 hari, tergantung rukyat/hisab),
// jadi Ramadan & Ayyamul Bidh bergeser tiap tahun di kalender Masehi.

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const userId = process.env.SINGLE_USER_ID;
  if (!userId) {
    return NextResponse.json({ error: "SINGLE_USER_ID belum diset di env" }, { status: 500 });
  }

  const tomorrow = addDays(new Date(), 1);
  const tomorrowStr = format(tomorrow, "dd-MM-yyyy");

  // Konversi tanggal Masehi besok -> Hijriah, via Aladhan API.
  const res = await fetch(`https://api.aladhan.com/v1/gToH/${tomorrowStr}`);
  const data = await res.json();
  const hijri = data?.data?.hijri;

  if (!hijri) {
    return NextResponse.json({ error: "Gagal ambil tanggal Hijriah" }, { status: 500 });
  }

  const hijriDay = parseInt(hijri.day, 10);
  const hijriMonth = parseInt(hijri.month.number, 10);
  const dayOfWeek = tomorrow.getDay(); // 0=Minggu, 1=Senin, 4=Kamis

  const reasons: string[] = [];

  const isRamadan = hijriMonth === 9;
  const isSeninKamis = dayOfWeek === 1 || dayOfWeek === 4;
  const isAyyamulBidh = [13, 14, 15].includes(hijriDay);

  if (isRamadan) reasons.push("ramadan");
  if (!isRamadan && isSeninKamis) reasons.push("senin_kamis");
  if (!isRamadan && isAyyamulBidh && !isSeninKamis) reasons.push("ayyamul_bidh");

  if (reasons.includes("ramadan")) {
    await sendTelegramMessage(FASTING_REMINDERS.ramadan_sahur);
  } else if (reasons.includes("senin_kamis")) {
    await sendTelegramMessage(FASTING_REMINDERS.senin_kamis);
  } else if (reasons.includes("ayyamul_bidh")) {
    await sendTelegramMessage(FASTING_REMINDERS.ayyamul_bidh);
  }

  // Tambahkan aktivitas "Puasa" di timeline besok kalau relevan, supaya
  // muncul juga di dashboard (bukan cuma notifikasi sekali kirim).
  if (reasons.length > 0) {
    const label = isRamadan
      ? "Puasa Ramadan"
      : isSeninKamis
      ? "Puasa Sunnah Senin/Kamis"
      : "Puasa Sunnah Ayyamul Bidh";

    await supabase.from("activities").insert({
      user_id: userId,
      title: label,
      category: "ibadah",
      scheduled_date: format(tomorrow, "yyyy-MM-dd"),
      status: "scheduled",
      source: "manual",
    });
  }

  return NextResponse.json({ ok: true, hijri, reasons });
}
