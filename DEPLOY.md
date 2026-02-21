# Deploy: Web full di Vercel, Database di Railway

**admin-web** = panel web admin (sisi operasional) dari sistem yang sama dengan aplikasi Flutter **law_firm**. Panel ini memanggil API **`/admin/*`**; app Flutter memanggil API **`/mobile/*`**. Satu backend API melayani keduanya; DB dipasang di Railway.

Arsitektur deploy:

- **Vercel** → **full deploy** admin-web (Next.js) — build, hosting, dan traffic 100% di Vercel.
- **Railway** → database (PostgreSQL); backend API yang melayani `/admin/*` dan `/mobile/*` pakai DB ini (backend bisa deploy di Railway/VPS/lain).

---

## Persyaratan

- Node.js 18+
- Akun [Vercel](https://vercel.com) dan [Railway](https://railway.app)
- Repo Git (GitHub/GitLab/Bitbucket)

---

## 1. Database di Railway

Database dipasang di Railway, nanti dipakai backend API (Prisma, Drizzle, dll.).

1. **Buat project Railway**
   - Login [railway.app](https://railway.app) → **New Project**

2. **Tambah database PostgreSQL**
   - Di project → **+ New** → **Database** → pilih **PostgreSQL**
   - Railway akan buat service PostgreSQL dan set env otomatis

3. **Ambil connection string**
   - Klik service **PostgreSQL** → tab **Variables** (atau **Connect**)
   - Copy variabel **DATABASE_URL** (format: `postgresql://user:password@host:port/railway`)
   - Simpan untuk dipakai di backend (env backend, atau nanti pas deploy API ke Railway)

4. **Optional: tambah MySQL/MongoDB**
   - Kalau butuh MySQL atau MongoDB, di project yang sama: **+ New** → **Database** → pilih yang dipakai.

**Penting:** Jangan commit `DATABASE_URL` ke Git. Pakai env vars di backend / Railway Variables saja.

---

## 2. Web (admin-web) — full deploy di Vercel

**Web ini full deploy di Vercel saja** (tidak di Railway). Build, hosting, dan traffic 100% Vercel. Next.js jalan di Vercel; frontend memanggil backend lewat `NEXT_PUBLIC_API_BASE_URL`.

1. **Connect repo**
   - Login [vercel.com](https://vercel.com) → **Add New** → **Project**
   - Import repo (root bisa repo root atau folder `admin-web`)

2. **Root directory**
   - Kalau repo berisi banyak project, set **Root Directory** ke `admin-web`.

3. **Environment variables**
   - **Settings** → **Environment Variables** → tambah:
   - `NEXT_PUBLIC_API_BASE_URL` = URL backend API (mis. `https://api-kamu.railway.app` kalau backend juga di Railway).

4. **Deploy**
   - **Deploy** → Vercel build Next.js dan kasih URL seperti `https://xxx.vercel.app`.

**Config:** `vercel.json` (Next.js, region Singapore).

---

## 3. Ringkasan alur

```
[Browser] → https://admin-kamu.vercel.app (Vercel, Next.js)
                    ↓
            NEXT_PUBLIC_API_BASE_URL
                    ↓
[Backend API]  →  (bisa di Railway / VPS / lain)
                    ↓
            DATABASE_URL
                    ↓
[PostgreSQL]  →  (Railway, service Database)
```

- **Vercel:** hanya web (admin panel); env: `NEXT_PUBLIC_API_BASE_URL` = URL backend yang expose **`/admin/*`**.
- **Railway:** DB (PostgreSQL); backend API yang sama melayani **`/admin/*`** (untuk admin-web) dan **`/mobile/*`** (untuk app Flutter law_firm). App Flutter set `API_BASE_URL` ke URL backend yang sama.

---

## 4. File env contoh

Di `admin-web` ada `.env.example`. Untuk development, copy jadi `.env.local` dan isi:

- `NEXT_PUBLIC_API_BASE_URL` → URL backend (dev atau production).

`DATABASE_URL` tidak dipakai langsung oleh admin-web; dipakai oleh backend yang connect ke DB di Railway.
