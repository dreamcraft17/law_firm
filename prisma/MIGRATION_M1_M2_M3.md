# Migrasi Database — M1 Client, M2 Time Tracking, M3 Expense

Setelah mengubah `schema.prisma`, jalankan:

```bash
cd admin-web
npx prisma migrate dev --name add_m1_m2_m3_client_time_expense
```

## Perubahan schema

- **Tabel baru:** `clients`, `client_contacts`, `time_entries`, `rate_cards`, `case_expenses`
- **Case:** kolom `stage` (intake|active|on_hold|closed), `parties` (JSON), relasi `clientId` → **clients** (bukan lagi users)
- **Task:** `description`, `due_date`, `sla_breach_at`, `assignee_id`
- **Document:** `folder`, `version`, `client_visible`
- **Invoice:** `invoice_number`, `paid_amount`, `client_id`, `due_date`, status: draft|sent|partial_paid|paid|overdue|void

## Data existing (Case.clientId dulu ke User)

Jika sebelumnya `cases.client_id` mengacu ke `users.id`:

1. Buat record di `clients` untuk setiap user yang masih dipakai sebagai client (atau dari daftar case yang punya client_id).
2. Update `cases.client_id` dari `users.id` ke `clients.id` yang sesuai (mis. satu client per user name).
3. Setelah data bersih, jalankan migrasi Prisma. Jika migrasi gagal karena FK, buat dulu tabel `clients` dan isi data, baru ubah FK `cases` ke `clients`.

Alternatif: jalankan migrasi dengan `prisma migrate dev`; jika ada error FK karena `client_id` masih mengacu ke user, jalankan script one-off untuk membuat client dari user dan mengubah `cases.client_id` ke id client yang baru.
