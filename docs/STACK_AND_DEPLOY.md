# Admin Web – Stack & Deploy (cPanel)

## Stack yang dipakai

| Layer | Teknologi |
|-------|-----------|
| **Framework** | **Next.js 14** (React) |
| **UI** | React 18, TypeScript |
| **Styling** | Tailwind CSS |
| **Icons** | Lucide React |

- **Build:** `npm run build` → hasil di folder `.next`
- **Jalankan:** `npm run start` (production) atau `npm run dev` (development)

---

## Koneksi dengan Backend & Aplikasi Mobile

```
┌─────────────────┐     ┌─────────────────────────────────────┐     ┌─────────────────┐
│  Admin Web      │     │  Backend API (satu server/URL)        │     │  Aplikasi Mobile │
│  (Next.js)      │────▶│  - /admin/*  → dipakai admin web      │◀────│  (Flutter)       │
│  di cPanel      │     │  - /mobile/* → dipakai app mobile     │     │                  │
└─────────────────┘     └─────────────────────────────────────┘     └─────────────────┘
```

- **Admin web** memanggil API dengan base URL dari env **`NEXT_PUBLIC_API_BASE_URL`** (path `/admin/*`).
- **Aplikasi mobile** memanggil API yang **sama** dengan base URL yang Anda set (path `/mobile/*`).
- Jadi: **satu backend**, dua client (admin web + mobile). Saat deploy, pastikan:
  1. Backend API sudah deploy dan bisa diakses (mis. `https://api.domain.com`).
  2. Admin web di cPanel diset `NEXT_PUBLIC_API_BASE_URL=https://api.domain.com`.
  3. Build Flutter mobile diset `API_BASE_URL=https://api.domain.com` (atau lewat env).

---

## Deploy Admin Web di cPanel

Berdasarkan isi project ini:
- **Tidak ada** SSR (`getServerSideProps`), API routes (`app/api/`), atau middleware.
- Semua request ke backend dilakukan **dari browser** (client-side fetch ke `NEXT_PUBLIC_API_BASE_URL`).

Jadi dua opsi deploy sama-sama valid.

### Rekomendasi (cPanel support Node.js App)

**Pakai Node.js App (Opsi B)** — lebih cocok dan aman untuk situasi Anda:

| Aspek | Node.js App | Static export |
|-------|----------------|----------------|
| **Aman** | ✅ Process dikelola cPanel; env rahasia bisa di server | ✅ Hanya file statis; URL API “terbakar” di build |
| **Cocok** | ✅ Tidak perlu ubah `next.config`; env bisa diganti di cPanel tanpa build ulang | ⚠️ Harus set `output: 'export'`; ganti API URL = build ulang + upload ulang |
| **Ke depan** | ✅ Kalau nanti tambah SSR/API routes, tetap jalan | ❌ Kalau nanti pakai SSR/API routes, harus pindah ke Node |

**Kesimpulan:** Karena cPanel Anda support **Setup Node.js App**, deploy dengan **Opsi B (Node.js app)**. Lebih fleksibel, env API bisa diatur di server, dan siap jika nanti ada fitur server-side.

---

Ada dua cara umum: **static export** (tanpa Node) atau **Node.js app** (jika host mendukung).

### Opsi A: Static export (tanpa Node di server)

Cocok jika halaman bisa di-render static (tidak pakai SSR/API routes yang harus jalan di server).

1. **Aktifkan static export** di `next.config.js`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
};
module.exports = nextConfig;
```

2. **Build di komputer Anda:**

```bash
cd admin-web
npm ci
npm run build
```

3. **Upload isi folder `out/`** ke cPanel:
   - File Manager → `public_html` (atau subdomain, mis. `admin.domain.com`) → upload semua isi `out/` (bukan folder `out` itu sendiri).
   - Atau pakai FTP: isi `out/` ke root domain/subdomain.

4. **Set base URL API**  
   Karena static, URL API harus sudah “terbakar” saat build. Sebelum `npm run build`, buat file `.env.production` di root project:

```
NEXT_PUBLIC_API_BASE_URL=https://api.domain-andalan.com
```

Lalu jalankan lagi `npm run build` dan upload lagi isi `out/`.

5. **Subdomain (opsional)**  
   Di cPanel: Subdomains → buat `admin.domain.com` → document root ke folder yang berisi file hasil upload tadi.

**Keterangan:** Dengan `output: 'export'`, tidak ada server Node di cPanel; semua request dari browser langsung ke backend API (CORS harus diizinkan di backend).

---

### Opsi B: Node.js app di cPanel (SSR / butuh Node)

Jika hosting punya fitur **“Setup Node.js App”** / **“Application Manager”**:

1. **Upload project** (tanpa `node_modules`) ke server, mis. di `~/admin-web`.

2. **Buat Node.js application** di cPanel:
   - Node version: 18 atau 20.
   - Application root: `admin-web` (atau path tempat Anda upload).
   - Application URL: mis. `admin.domain.com`.

3. **Set env** di cPanel (biasanya di form “Environment variables”):
   - `NEXT_PUBLIC_API_BASE_URL=https://api.domain-andalan.com`

4. **Install & build di server** (lewat SSH atau “Run NPM Install” / “Run NPM Script” di cPanel):

```bash
cd ~/admin-web
npm ci
npm run build
```

5. **Start command** di cPanel biasanya:
   - `npm run start`  
   atau  
   - `node node_modules/next/dist/bin/next start`

6. **Proxy:** Aktifkan “Create application” / “Passenger” agar lalu lintas ke subdomain/domain diarahkan ke proses Node.

Kalau cPanel tidak punya Node.js, pakai **Opsi A (static export)**.

---

## Ringkas

| Pertanyaan | Jawaban |
|------------|---------|
| Stack admin-web? | **Next.js 14, React 18, TypeScript, Tailwind, Lucide** |
| Cara deploy di cPanel? | **Static:** set `output: 'export'`, build, upload isi `out/`. **Atau** pakai **Node.js App** jika tersedia. |
| Konek ke mobile gimana? | **Sama-sama pakai satu Backend API**; admin web pakai `/admin/*`, mobile pakai `/mobile/*`. Set `NEXT_PUBLIC_API_BASE_URL` (admin) dan `API_BASE_URL` (mobile) ke URL backend yang sama. |
