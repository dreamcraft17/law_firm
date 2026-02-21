# Deploy Admin Web — Vercel & Railway

Panduan singkat deploy **admin-web** (Next.js) ke Vercel dan Railway.

---

## Persyaratan

- Node.js 18+
- Akun [Vercel](https://vercel.com) dan/atau [Railway](https://railway.app)
- Repo Git (GitHub/GitLab/Bitbucket) untuk connect

---

## 1. Deploy ke Vercel

1. **Connect repo**
   - Login ke [vercel.com](https://vercel.com) → **Add New** → **Project**
   - Import repo yang berisi folder `admin-web` (atau pilih repo yang root-nya adalah admin-web)

2. **Root directory**
   - Jika repo berisi banyak project, set **Root Directory** ke `admin-web`.

3. **Build settings** (biasanya terdeteksi otomatis)
   - Framework Preset: **Next.js**
   - Build Command: `npm run build`
   - Output: otomatis (Vercel mengenali Next.js)

4. **Environment variables**
   - Tambah di **Settings → Environment Variables** jika aplikasi butuh (mis. `NEXT_PUBLIC_API_URL`).

5. **Deploy**
   - Klik **Deploy**. Vercel akan build dan memberi URL seperti `https://xxx.vercel.app`.

**Config yang dipakai:** `vercel.json` (framework Next.js, region `sin1`).

---

## 2. Deploy ke Railway

1. **Connect repo**
   - Login ke [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
   - Pilih repo dan (jika perlu) set **Root Directory** ke `admin-web`.

2. **Build & start**
   - Railway memakai `railway.toml` di project:
     - Build: `npm run build`
     - Start: `npm run start`
   - Variabel **PORT** otomatis diset oleh Railway; aplikasi sudah membacanya lewat `scripts/start.js`.

3. **Environment variables**
   - Di dashboard Railway: **Variables** → tambah env yang dibutuhkan.

4. **Domain**
   - **Settings** → **Networking** → **Generate Domain** untuk dapat URL publik.

**Config yang dipakai:** `railway.toml` + `scripts/start.js` (PORT cross-platform).

---

## 3. Setelah deploy

- **Vercel:** URL production ada di dashboard project; bisa atur custom domain di **Settings → Domains**.
- **Railway:** URL dari **Generate Domain**; bisa tambah custom domain di **Settings**.

Kalau ada env (API URL, auth, dll), set di **Environment Variables** di masing-masing platform dan redeploy.
