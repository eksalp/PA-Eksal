-- Jalankan sekali di Supabase SQL Editor untuk mulai track habit ibadah.
-- Ganti '<USER_ID>' dengan UUID user kamu (lihat Authentication > Users).

insert into habits (user_id, name, frequency, target_per_period) values
  ('<USER_ID>', 'Sholat 5 waktu', 'daily', 5),
  ('<USER_ID>', 'Baca Quran', 'daily', 1),
  ('<USER_ID>', 'Dzikir pagi', 'daily', 1),
  ('<USER_ID>', 'Dzikir petang', 'daily', 1),
  ('<USER_ID>', 'Puasa sunnah', 'weekly', 1);
