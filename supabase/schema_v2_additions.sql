-- ============================================================
-- AI Life OS — Tambahan Skema v2
-- Jalankan ini SETELAH schema_v1.sql di Supabase SQL Editor.
-- Cakupan: Recurring Activities, Finance Tracker (akun,
-- transaksi, aset, utang-piutang)
-- ============================================================

-- ------------------------------------------------------------
-- 0. Izinkan sumber aktivitas baru: dari recurring template & Telegram
-- ------------------------------------------------------------
alter table activities drop constraint if exists activities_source_check;
alter table activities add constraint activities_source_check
  check (source in ('manual', 'google_calendar', 'recurring', 'telegram'));

-- Tandai aktivitas yang berasal dari recurring template mana (untuk audit)
alter table activities add column if not exists recurring_activity_id uuid;

-- ------------------------------------------------------------
-- 1. RECURRING_ACTIVITIES (template kegiatan berulang)
-- ------------------------------------------------------------
-- Contoh: "Lari" tiap Senin & Kamis jam 17:00 — cron akan
-- "materialize" ini jadi baris di `activities` tiap pagi.

create table recurring_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  title text not null,
  category text,
  scheduled_time time,

  -- null = tiap hari. Contoh isi: {1,4} artinya Senin(1) & Kamis(4).
  -- 0=Minggu, 1=Senin, ..., 6=Sabtu (mengikuti JS Date.getDay())
  days_of_week int[],

  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table activities add constraint fk_recurring_activity
  foreign key (recurring_activity_id) references recurring_activities(id) on delete set null;

alter table recurring_activities enable row level security;
create policy "user manages own recurring_activities" on recurring_activities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 2. ACCOUNTS (dompet: cash, bank, e-wallet, investasi)
-- ------------------------------------------------------------

create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  name text not null,                -- contoh: 'BCA', 'GoPay', 'Cash'
  type text not null default 'bank'
    check (type in ('cash', 'bank', 'ewallet', 'investment', 'other')),
  currency text not null default 'IDR',

  -- Saldo disimpan sebagai kolom terpisah (bukan cuma dihitung dari
  -- transactions) supaya bisa diisi manual saat pertama setup akun lama.
  current_balance numeric(16,2) not null default 0,

  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. TRANSACTIONS (pemasukan, pengeluaran, transfer)
-- ------------------------------------------------------------

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references accounts(id) on delete set null,

  type text not null check (type in ('income', 'expense', 'transfer')),
  amount numeric(16,2) not null,     -- selalu positif; `type` yang menentukan arah
  category text,                     -- contoh: 'makan', 'transport', 'gaji'
  note text,

  -- Untuk transfer antar akun
  transfer_to_account_id uuid references accounts(id) on delete set null,

  -- Kalau transaksi ini terkait pembayaran utang/piutang
  related_debt_id uuid,              -- FK ditambahkan setelah tabel debts dibuat

  transaction_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index idx_transactions_user_date on transactions (user_id, transaction_date);

-- ------------------------------------------------------------
-- 4. ASSETS (aset: properti, kendaraan, emas, investasi, dll)
-- ------------------------------------------------------------

create table assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  name text not null,                -- contoh: 'Rumah Bandung', 'Motor Vario'
  category text not null default 'other'
    check (category in ('property', 'vehicle', 'gold', 'investment', 'electronic', 'other')),

  estimated_value numeric(16,2) not null,
  acquired_date date,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5. DEBTS (utang & piutang)
-- ------------------------------------------------------------

create table debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  direction text not null check (direction in ('utang', 'piutang')),
  -- 'utang' = kamu yang berhutang ke orang lain
  -- 'piutang' = orang lain berhutang ke kamu

  counterparty_name text not null,   -- nama orang/pihak terkait
  original_amount numeric(16,2) not null,
  remaining_amount numeric(16,2) not null,

  due_date date,
  status text not null default 'active' check (status in ('active', 'paid', 'overdue')),
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table transactions add constraint fk_related_debt
  foreign key (related_debt_id) references debts(id) on delete set null;

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table accounts enable row level security;
alter table transactions enable row level security;
alter table assets enable row level security;
alter table debts enable row level security;

create policy "user manages own accounts" on accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user manages own transactions" on transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user manages own assets" on assets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user manages own debts" on debts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- CATATAN DESAIN
-- ============================================================
-- 1. current_balance di `accounts` TIDAK auto-update dari transactions
--    di v2 ini — itu butuh trigger/function yang sengaja belum ditambah
--    supaya migrasi ini tetap simpel. Update saldo manual dulu, atau
--    minta ditambahkan trigger sebagai langkah berikutnya.
--
-- 2. Net worth = SUM(accounts.current_balance) + SUM(assets.estimated_value)
--    - SUM(debts WHERE direction='utang' AND status!='paid'.remaining_amount)
--    + SUM(debts WHERE direction='piutang' AND status!='paid'.remaining_amount)
--    Dihitung di halaman, bukan disimpan sebagai kolom, supaya selalu akurat.
-- ============================================================
