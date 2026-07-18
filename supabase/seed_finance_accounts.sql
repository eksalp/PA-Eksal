-- Jalankan sekali di Supabase SQL Editor untuk mulai pakai Finance Tracker.
-- Ganti '<USER_ID>' dan isi saldo/nama sesuai kondisi kamu sekarang.

insert into accounts (user_id, name, type, current_balance) values
  ('<USER_ID>', 'Cash', 'cash', 0),
  ('<USER_ID>', 'Rekening Utama', 'bank', 0),
  ('<USER_ID>', 'GoPay/OVO/Dana', 'ewallet', 0);

-- Contoh nambah aset (opsional, edit/hapus sesuai kebutuhan):
-- insert into assets (user_id, name, category, estimated_value) values
--   ('<USER_ID>', 'Motor', 'vehicle', 15000000);

-- Contoh nambah utang/piutang (opsional):
-- insert into debts (user_id, direction, counterparty_name, original_amount, remaining_amount, due_date) values
--   ('<USER_ID>', 'utang', 'Budi', 500000, 500000, '2026-08-01');
