# Kesiapan Migrasi Database (admin-web)

## Status: **ready deploy** — satu perintah buat base + tabel web

---

## Yang sudah ada

| Item | Lokasi | Keterangan |
|------|--------|------------|
| Schema base | `docs/schema-base.sql` | Tabel **users** dan **cases** (idempotent). Dijalankan dulu. |
| Schema web | `docs/schema-web-tables.sql` | Tabel admin: system_settings, workflow_templates, retention_policies, custom_fields, case_risk_scores, lawyer_performance_metrics |
| Script migrasi | `scripts/run-web-migration.js` | Jalankan base lalu web; butuh `DATABASE_URL` dan dependency `pg` |
| NPM script | `npm run db:migrate` | Satu perintah: buat users & cases, lalu semua tabel web |

---

## Cara jalankan migrasi (ready deploy)

1. Set **DATABASE_URL** di `.env.local` (pakai Public URL dari Railway).
2. Di folder `admin-web`:
   ```bash
   npm install
   npm run db:migrate
   ```
3. Selesai. DB punya tabel **users**, **cases**, dan semua tabel web. Siap dipakai backend + admin.

---

## Checklist deploy

- [ ] PostgreSQL jalan (Railway / VPS) dan **DATABASE_URL** (Public URL) di `.env.local`.
- [ ] `npm install` lalu `npm run db:migrate`.
- [ ] Backend API set **DATABASE_URL** ke URL yang sama (internal atau public sesuai deploy).
- [ ] Admin-web (Vercel) set **NEXT_PUBLIC_API_BASE_URL** ke URL backend.

Semua DDL pakai `IF NOT EXISTS`, jadi aman dijalankan ulang.
