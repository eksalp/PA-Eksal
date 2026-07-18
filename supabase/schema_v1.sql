-- ============================================================
-- AI Life OS — Skema Database v1 (Supabase / PostgreSQL)
-- ============================================================
-- Cakupan v1: Timeline+Task, Habit Tracker, Dashboard,
-- AI Daily Review, Google Calendar (import satu arah)
-- ============================================================

-- Supabase otomatis menyediakan tabel auth.users.
-- Semua tabel di bawah mereferensikan auth.users(id) sebagai owner.

-- ------------------------------------------------------------
-- 1. ACTIVITIES (gabungan Timeline + Task Manager)
-- ------------------------------------------------------------
-- Satu tabel untuk semua "hal yang dilakukan user hari itu",
-- baik yang punya jadwal jam (timeline) maupun yang tidak (task biasa).

create table activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  title text not null,
  category text,                     -- contoh: 'work', 'health', 'personal'
  notes text,

  -- Penjadwalan
  scheduled_date date not null,      -- tanggal aktivitas ini berlaku
  scheduled_time time,               -- null = task tanpa jam spesifik
  duration_minutes int,

  -- Status siklus hidup
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'skipped', 'rescheduled')),

  -- Jika status = 'rescheduled', simpan jadwal baru & alasan (untuk log AI nanti)
  rescheduled_to_date date,
  rescheduled_to_time time,
  reschedule_reason text,

  -- Sumber data: dibuat manual user, atau ditarik dari Google Calendar
  source text not null default 'manual'
    check (source in ('manual', 'google_calendar')),
  external_event_id text,            -- id event di Google Calendar, jika source = google_calendar

  completed_at timestamptz,
  reminded_at timestamptz,          -- kapan reminder Telegram terakhir dikirim (cegah kirim dobel)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_activities_user_date on activities (user_id, scheduled_date);
create index idx_activities_status on activities (user_id, status);

-- ------------------------------------------------------------
-- 2. HABITS (definisi habit yang mau ditrack)
-- ------------------------------------------------------------

create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  name text not null,                -- contoh: 'Sholat', 'Minum air', 'Lari'
  frequency text not null default 'daily'
    check (frequency in ('daily', 'weekly')),
  target_per_period int not null default 1,  -- contoh: minum air 8x/hari

  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. HABIT_LOGS (catatan check-in harian per habit)
-- ------------------------------------------------------------

create table habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  log_date date not null,
  completed_count int not null default 1,  -- untuk habit dengan target > 1x

  created_at timestamptz not null default now(),

  unique (habit_id, log_date)  -- satu baris per habit per hari (accumulate count di sini)
);

create index idx_habit_logs_user_date on habit_logs (user_id, log_date);

-- Streak DIHITUNG, bukan disimpan sebagai kolom statis —
-- dihitung dari habit_logs saat dashboard dibuka (hindari data basi).

-- ------------------------------------------------------------
-- 4. DAILY_REVIEWS (hasil AI Daily Review tiap malam)
-- ------------------------------------------------------------

create table daily_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  review_date date not null,
  summary text not null,             -- ringkasan 2-3 kalimat dari AI
  win text,                          -- satu hal yang berhasil
  missed text,                       -- satu hal yang terlewat

  -- Simpan input mentah yang dikirim ke AI, untuk debugging/audit
  raw_input jsonb,

  created_at timestamptz not null default now(),

  unique (user_id, review_date)  -- satu review per user per hari
);

-- ------------------------------------------------------------
-- 5. GOOGLE_CALENDAR_CONNECTIONS (kredensial integrasi)
-- ------------------------------------------------------------

create table google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,

  access_token text not null,        -- simpan terenkripsi (Supabase Vault / edge function)
  refresh_token text not null,
  token_expires_at timestamptz not null,

  calendar_id text not null default 'primary',
  last_synced_at timestamptz,

  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY — wajib aktif di semua tabel milik user
-- ============================================================

alter table activities enable row level security;
alter table habits enable row level security;
alter table habit_logs enable row level security;
alter table daily_reviews enable row level security;
alter table google_calendar_connections enable row level security;

create policy "user manages own activities" on activities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user manages own habits" on habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user manages own habit_logs" on habit_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user manages own daily_reviews" on daily_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user manages own google_calendar_connections" on google_calendar_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- CATATAN DESAIN
-- ============================================================
-- 1. Tabel goals, journal_entries, reports SENGAJA belum dibuat —
--    itu masuk v2+ sesuai scoping. Jangan tambahkan dulu supaya
--    skema tetap ramping dan sesuai kebutuhan v1.
--
-- 2. "AI Memory" (preferensi user, pola perilaku) BELUM punya tabel
--    sendiri di v1. Untuk sementara, AI Daily Review membaca langsung
--    dari activities + habit_logs. Tabel user_memory / preferences
--    baru masuk akal dibuat di v2 setelah ada cukup data historis
--    untuk tahu pola apa yang benar-benar perlu disimpan.
--
-- 3. reschedule_reason & source di tabel activities sengaja ditambah
--    dari awal — ini "murah" untuk dibangun sekarang, tapi jadi bahan
--    baku penting untuk fitur AI auto-reprioritization di v2.
-- ============================================================
