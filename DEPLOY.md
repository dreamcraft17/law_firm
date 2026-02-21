# Deploy: Admin-web + Backend (Next.js + Prisma) di Vercel, DB di Railway

**admin-web** = **frontend (panel admin)** + **backend API** dalam satu repo. Next.js melayani halaman dan route **`/api/admin/*`** (untuk panel) serta **`/api/mobile/*`** (untuk app Flutter law_firm). Database pakai **Prisma**; satu PostgreSQL (mis. Railway).

Arsitektur deploy:

- **Vercel** → satu deploy: Next.js (panel + API). Env: `DATABASE_URL` (PostgreSQL), `NEXT_PUBLIC_API_BASE_URL` (URL app + `/api` kalau panel panggil backend ini).
- **Railway** → PostgreSQL. `DATABASE_URL` dipakai di Vercel (env) untuk koneksi dari API.

---

## Persyaratan

- Node.js 18+
- Akun [Vercel](https://vercel.com) dan [Railway](https://railway.app)
- Repo Git (GitHub/GitLab/Bitbucket)

---

## 1. Database di Railway

1. **Buat project Railway** → **+ New** → **Database** → **PostgreSQL**
2. Ambil **DATABASE_URL** (pakai **Public URL** kalau jalankan migrasi dari PC).
3. Jalankan migrasi dari folder `admin-web`:
   ```bash
   npm install
   # Set DATABASE_URL di .env.local
   npm run db:migrate
   ```
   Ini membuat tabel: users, cases, tasks, documents, events, invoices, notifications, system_settings, workflow_templates, retention_policies, custom_fields, case_risk_scores, lawyer_performance_metrics.

---

## 2. Deploy ke Vercel (panel + API)

1. **Connect repo** → Import project, **Root Directory** = `admin-web` (jika repo berisi banyak folder).
2. **Environment variables** (wajib):
   - **`DATABASE_URL`** = connection string PostgreSQL (dari Railway, bisa internal).
   - **`NEXT_PUBLIC_API_BASE_URL`** = URL app ini + `/api`, mis. `https://xxx.vercel.app/api` (agar panel memanggil API di repo yang sama).
3. **Deploy** → Vercel akan jalankan `prisma generate && next build` lalu host Next.js (termasuk `/api/admin/*` dan `/api/mobile/*`).

---

## 3. App Flutter (law_firm)

Set **API_BASE_URL** di Flutter ke URL backend = URL deploy admin-web + `/api`, mis. `https://xxx.vercel.app/api`. Path mobile: `mobile/auth`, `mobile/cases`, dll. (tetap sama).

---

## 4. Ringkasan

| Komponen   | Tempat   | Catatan |
|-----------|----------|---------|
| Panel admin + API | Vercel | Satu app Next.js; route `/api/admin/*` dan `/api/mobile/*`. |
| Database  | Railway | PostgreSQL; env `DATABASE_URL` di Vercel. |
| Flutter   | -       | `API_BASE_URL` = `https://xxx.vercel.app/api`. |

File env: `.env.example`. Untuk development, copy ke `.env.local` dan isi `DATABASE_URL` dan (opsional) `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api`.
