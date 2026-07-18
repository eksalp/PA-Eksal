# AI Life OS — v1 Scaffold

Scaffold Next.js 14 (App Router) + Supabase untuk 4 fitur v1:
Timeline/Task, Habit Tracker, Dashboard, AI Daily Review.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Buat project Supabase** di https://supabase.com, lalu jalankan
   `schema_v1.sql` (dari langkah sebelumnya) di SQL Editor Supabase-mu.

3. **Aktifkan Auth** — cukup pakai Email/Password atau Magic Link dari
   Supabase Auth settings. Halaman login belum dibuat di scaffold ini
   (lihat "Belum termasuk" di bawah).

4. **Copy env file**
   ```bash
   cp .env.local.example .env.local
   ```
   Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` dari
   Project Settings > API di dashboard Supabase. Isi `OPENAI_API_KEY` untuk
   fitur AI Daily Review.

5. **Jalankan dev server**
   ```bash
   npm run dev
   ```
   Buka http://localhost:3000

## Struktur

```
app/
  page.tsx              → Dashboard
  activities/page.tsx    → Timeline + tambah aktivitas
  habits/page.tsx         → Habit tracker + check-in
  api/daily-review/route.ts → Endpoint AI Daily Review (panggil via cron)
lib/supabase/
  client.ts               → Supabase client untuk Client Components
  server.ts                → Supabase client untuk Server Components
types/database.ts          → Tipe TypeScript sesuai schema_v1.sql
```

## Asisten Spiritual (sholat, Quran, puasa sunnah, Ramadan)

Sistem ini otomatis paham kalender Hijriah, jadi tidak perlu kamu update
manual tiap tahun. 3 cron bekerja sama:

1. **`/api/cron/setup-prayer-times`** (tiap 00:05) — ambil jadwal sholat
   hari itu + otomatis bikin slot "Baca Quran" 15 menit setelah tiap sholat.

2. **`/api/cron/setup-spiritual-calendar`** (tiap jam 13:00, cek hari
   *besok*) — konversi tanggal ke Hijriah via API, lalu deteksi otomatis:
   - Lagi Ramadan? → reminder sahur + aktivitas "Puasa Ramadan"
   - Besok Senin/Kamis? → reminder puasa sunnah malam ini
   - Besok tanggal 13/14/15 Hijriah (Ayyamul Bidh)? → reminder puasa sunnah

   Kenapa dicek malam sebelumnya: niat puasa sunnah/Ramadan harus sebelum
   Subuh, jadi reminder perlu sampai malam sebelumnya, bukan pas harinya.

3. **`/api/cron/send-reminders`** (tiap menit) — kirim notifikasi sesuai
   jenis aktivitas: sholat dapat dzikir singkat setelahnya, slot Quran
   dapat pengingat tilawah, puasa dapat reminder sahur/iftar.

**Setup habit ibadah** — jalankan `supabase/seed_spiritual_habits.sql` di
SQL Editor (ganti `<USER_ID>` dulu) untuk mulai track: Sholat 5 waktu,
Baca Quran, Dzikir pagi/petang, Puasa sunnah. Nanti bisa di-checklist
manual di halaman Habit.

Semua teks dzikir/reminder ada di `lib/duas.ts` — silakan edit sesuai
preferensi kamu (misal ganti ke bacaan dzikir tertentu, tambah doa lain).

## Kegiatan Berulang (lari, renang, dll) & Request via Chat

1. **Jalankan `supabase/schema_v2_additions.sql`** di SQL Editor Supabase
   (setelah `schema_v1.sql`). Ini nambah tabel `recurring_activities` +
   seluruh tabel finance tracker sekaligus.

2. **Cron `/api/cron/materialize-recurring`** (tiap 00:05) — tiap pagi cek
   template recurring yang aktif dan cocok hari itu, lalu buat aktivitasnya
   di timeline hari ini. Otomatis tidak bentrok dengan slot sholat/Quran
   karena kamu yang tentukan jamnya sendiri saat request.

3. **Cron `/api/cron/weather-check`** (tiap jam 06:00) — cek forecast hujan
   via Open-Meteo (gratis, tanpa API key) untuk aktivitas berkategori
   olahraga outdoor (lari, renang, sepeda, jogging) hari itu. Kalau
   kemungkinan hujan ≥60%, kirim **saran** pindah indoor/geser jadwal lewat
   Telegram — bukan auto-ubah, keputusan tetap di kamu. Set `WEATHER_LAT`
   / `WEATHER_LON` di env sesuai lokasimu (default Jakarta).

## Setup Chat 2 Arah (request kegiatan lewat Telegram)

Sekarang kamu bisa chat bot Telegram-mu langsung untuk nambah kegiatan:
- `"tambahin lari sore jam 5"` → ditambah cuma untuk hari ini
- `"renang tiap sabtu jam 7 pagi"` → jadi recurring, otomatis muncul tiap Sabtu seterusnya

**Setup webhook** (sekali saja, setelah deploy ke Vercel):
```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://domain-kamu.vercel.app/api/telegram/webhook"
```

Testing lokal butuh tunnel (ngrok/cloudflared) karena Telegram perlu URL
publik untuk kirim webhook — tidak bisa langsung ke `localhost`.

## Finance Tracker

1. **Jalankan `supabase/seed_finance_accounts.sql`** (ganti `<USER_ID>`)
   untuk mulai dengan akun Cash, Rekening, e-wallet.

2. Buka halaman **Finance** di app — nampilin net worth (kas + aset +
   piutang - utang), daftar akun, transaksi terakhir, dan utang/piutang aktif.

3. **Yang belum otomatis**: saldo akun (`current_balance`) tidak auto-update
   dari transaksi yang kamu tambahkan — itu sengaja disederhanakan dulu
   di v2. Kalau mau auto-update, kabari, itu bisa ditambah pakai database
   trigger.

4. Nambah aset/utang-piutang untuk sekarang lewat Supabase Table Editor
   atau contoh SQL di `seed_finance_accounts.sql` — form khusus di UI
   belum dibuat (bisa ditambah kalau kamu sering pakai).

## Setup Reminder Sholat (via Telegram)

Sistem ini mengambil jadwal sholat **asli hari itu** (bukan jam tetap),
karena waktu sholat bergeser tiap hari. Alurnya:

1. **`SUPABASE_SERVICE_ROLE_KEY`** — ambil dari Project Settings > API di
   Supabase (bagian "service_role", bukan "anon"). Ini dipakai cron job
   untuk akses database tanpa sesi login user.

2. **`SINGLE_USER_ID`** — UUID user kamu di Supabase. Lihat di
   Authentication > Users setelah kamu daftar/login pertama kali.

3. **`CRON_SECRET`** — string acak bebas, buat pelindung endpoint cron
   supaya tidak bisa dipanggil sembarang orang.

4. **`PRAYER_CITY`** / **`PRAYER_COUNTRY`** — lokasi buat hitung jadwal
   sholat (default: Jakarta, Indonesia), pakai data dari Aladhan API.

5. **Deploy ke Vercel** — `vercel.json` sudah berisi 2 cron job:
   - `/api/cron/setup-prayer-times` — jalan tiap jam 00:05, ambil 5 jadwal
     sholat hari itu dan simpan sebagai aktivitas.
   - `/api/cron/send-reminders` — jalan tiap menit, cek aktivitas yang
     jamnya "sekarang" dan kirim notifikasi Telegram.

   ⚠️ **Penting**: Vercel Hobby (gratis) cuma bisa cron minimal 1x/hari,
   bukan tiap menit. Untuk reminder real-time, ada 2 opsi:
   - Upgrade ke Vercel Pro (cron per-menit didukung), atau
   - Pakai cron eksternal gratis seperti [cron-job.org](https://cron-job.org)
     yang memanggil `https://domain-kamu.vercel.app/api/cron/send-reminders`
     tiap menit, dengan header `Authorization: Bearer <CRON_SECRET>`.

6. **Testing lokal** — panggil manual dengan curl:
   ```bash
   curl -H "Authorization: Bearer <CRON_SECRET>" \
     http://localhost:3000/api/cron/setup-prayer-times
   curl -H "Authorization: Bearer <CRON_SECRET>" \
     http://localhost:3000/api/cron/send-reminders
   ```

Mau nambah reminder lain (minum air tiap 2 jam, dsb)? Tinggal insert
activity manual dengan `scheduled_time` yang diinginkan — cron
`send-reminders` otomatis akan menangkapnya.

## Setup Telegram (notifikasi)

1. **Buat bot** — chat ke [@BotFather](https://t.me/BotFather) di Telegram, kirim
   `/newbot`, ikuti instruksinya. Kamu akan dapat token seperti
   `123456:ABC-xxxxxxxxxxxxxxxxxxxxx`. Simpan sebagai `TELEGRAM_BOT_TOKEN`.

2. **Dapatkan chat ID kamu** — chat bot barumu dulu (kirim pesan apa saja),
   lalu buka di browser:
   ```
   https://api.telegram.org/bot<TOKEN_KAMU>/getUpdates
   ```
   Cari `"chat":{"id": ...}` di hasilnya — angka itu `TELEGRAM_CHAT_ID`.

3. **Isi `.env.local`** dengan kedua nilai di atas.

4. **Tes koneksi** — jalankan `npm run dev`, lalu buka
   `http://localhost:3000/api/telegram-test` di browser. Kalau berhasil,
   kamu akan dapat pesan di Telegram.

5. AI Daily Review (`/api/daily-review`) sekarang otomatis mengirim
   ringkasannya ke Telegram tiap kali dipanggil.

Catatan: setup ini untuk single-user (kamu sendiri) — token & chat ID
disimpan di env, bukan per-user di database. Kalau nanti aplikasinya
dipakai banyak orang, `TELEGRAM_CHAT_ID` perlu dipindah ke tabel user
di database.

## Belum termasuk (sengaja, sesuai scoping v1)

- **Halaman login/signup** — pakai Supabase Auth UI atau bikin custom,
  belum di-scaffold di sini supaya file tetap fokus ke fitur inti.
- **Middleware refresh session** — untuk production, tambahkan
  `middleware.ts` yang me-refresh session Supabase di tiap request
  (lihat dokumentasi `@supabase/ssr`).
- **Integrasi Google Calendar** — tabel `google_calendar_connections`
  sudah ada di schema, tapi OAuth flow-nya belum diimplementasi.
- **Form tambah habit** — untuk sekarang tambahkan habit manual lewat
  Supabase Table Editor.
- **Cron job AI Daily Review** — endpoint-nya sudah ada, tinggal
  dijadwalkan (Vercel Cron / Supabase Edge Function + pg_cron).

## Langkah berikutnya yang disarankan

1. Tambah halaman login (Supabase Auth UI paling cepat).
2. Deploy ke Vercel, hubungkan env vars.
3. Setup cron untuk `/api/daily-review`.
4. Baru mulai v2: Google Calendar OAuth dua arah, Goal Tracking, Reports.
