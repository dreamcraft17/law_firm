# Kesiapan Migrasi Database (admin-web)

## Status: **siap migrasi tabel web** — DDL idempotent + script runner tersedia

---

## Yang sudah ada

| Item | Lokasi | Keterangan |
|------|--------|------------|
| Strategi DB | `docs/DATABASE_STRATEGY.md` | Satu DB, RLS, soft delete, daftar tabel web |
| DDL tabel web | `docs/schema-web-tables.sql` | PostgreSQL, pakai `IF NOT EXISTS` (aman dijalankan ulang). Tabel: `system_settings`, `workflow_templates`, `retention_policies`, `custom_fields`, `case_risk_scores`, `lawyer_performance_metrics` |
| Script migrasi | `scripts/run-web-migration.js` | Jalankan DDL ke DB; butuh env `DATABASE_URL` dan dependency `pg` |
| NPM script | `npm run db:migrate` | Menjalankan script migrasi di atas |
| Env contoh | `.env.example` | `DATABASE_URL` untuk backend / untuk script migrasi |

---

## Yang perlu sebelum migrasi

1. **Tabel inti**  
   DDL web punya FK ke `cases(id)` dan `users(id)`. Tabel **`users`** dan **`cases`** harus sudah ada di DB (dari backend / migrasi inti). Kalau belum, jalankan migrasi inti dulu, baru `db:migrate`.

2. **Backend API**  
   admin-web hanya frontend; koneksi DB dipakai oleh **backend API**. `DATABASE_URL` dipakai di backend. Script `db:migrate` di repo ini hanya untuk menjalankan DDL tabel web (sekali jalan atau saat setup).

---

## Cara jalankan migrasi (tabel web)

1. Pasang dependency: `npm install` (termasuk `pg`).
2. Set `DATABASE_URL` (dari Railway atau env lain), mis.  
   `set DATABASE_URL=postgresql://user:pass@host:5432/railway` (Windows) atau  
   `export DATABASE_URL=postgresql://...` (Linux/macOS).
3. Jalankan:  
   `npm run db:migrate`  
   Script akan menjalankan `docs/schema-web-tables.sql` ke DB. DDL pakai `IF NOT EXISTS`, jadi aman dijalankan ulang.

---

## Checklist sebelum jalankan migrasi (tabel web)

- [ ] PostgreSQL sudah jalan (mis. Railway / VPS).
- [ ] Tabel inti **users** dan **cases** sudah ada (dari backend/migrasi lain).
- [ ] `DATABASE_URL` sudah diset.
- [ ] Sudah `npm install` (agar `pg` terpasang).
- [ ] Jalankan `npm run db:migrate`.

---

## Ringkasan

- **Dokumentasi & DDL:** siap (strategy + schema idempotent).
- **Runner:** siap — `npm run db:migrate` setelah tabel inti ada dan `DATABASE_URL` diset.

Setelah migrasi web dijalankan, DB siap dipakai backend untuk fitur admin (W2–W9).
