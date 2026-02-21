# Isi Form "CREATE APPLICATION" di cPanel (admin-web)

Sesuai screenshot form **CREATE APPLICATION** di cPanel, isi seperti berikut.

---

## Langsung isi di form

| Field di form | Nilai yang diisi |
|---------------|-------------------|
| **Node.js version** | Biarkan **18.20.8** (atau 18.x). |
| **Application mode** | Biarkan **Production**. |
| **Application root** | Path ke folder tempat Anda upload file deploy. Contoh: **`public_html/tjl.dozernapitupulu.com`**. Nanti isi folder ini dengan hasil build standalone (termasuk `server.js`). |
| **Application URL** | Biarkan **tjl.dozernapitupulu.com** (atau sesuaikan subdomain Anda). |
| **Application startup file** | **`server.js`** (wajib; baru ada setelah build standalone). |
| **Environment variables** | Klik **ADD VARIABLE**, tambah: Name **`NEXT_PUBLIC_API_BASE_URL`**, Value **`https://api.domain-anda.com`** (URL backend API yang dipakai mobile). `NODE_ENV=production` biasanya sudah ada. |

Lalu klik **CREATE**.

---

## Sebelum CREATE: siapkan file deploy (standalone)

Agar field **Application startup file** bisa pakai `server.js`, project harus di-build dengan **standalone**. Di `next.config.js` sudah ditambah `output: 'standalone'`.

1. **Di komputer Anda:**

```bash
cd admin-web
npm ci
# Buat .env.production isi: NEXT_PUBLIC_API_BASE_URL=https://api.domain-anda.com
npm run build
```

2. **Siapkan isi untuk upload:**
   - Buka folder **`.next/standalone`** (ada setelah `npm run build`).
   - Copy **semua isi** `.next/standalone/` ke satu folder (mis. `deploy/`).
   - Copy folder **`.next/static`** ke dalam `deploy/.next/static` (jika belum ada).
   - Copy folder **`public`** (jika ada) ke dalam `deploy/public`.
   - Pastikan di root folder deploy ada file **`server.js`**.

3. **Upload** seluruh isi folder deploy itu ke path **Application root** di cPanel (mis. ke `public_html/tjl.dozernapitupulu.com`).

4. Baru setelah file ada di server, buat aplikasi di cPanel (isi form seperti tabel di atas) dan klik **CREATE**. Lalu **Restart** aplikasi.

---

## Ringkas

- **Application startup file:** `server.js`
- **Application root:** path ke folder yang berisi `server.js` + isi standalone (mis. `public_html/tjl.dozernapitupulu.com`)
- **Env:** tambah `NEXT_PUBLIC_API_BASE_URL` = URL backend API
