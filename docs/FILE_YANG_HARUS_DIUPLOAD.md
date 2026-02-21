# File yang Harus Di-upload ke cPanel

Upload **isi** folder **deploy** ke Application root di cPanel (mis. `public_html/tjl.dozernapitupulu.com`).

---

## Cara 1: Pakai script

1. Build: `npm ci` lalu `npm run build`
2. Jalankan: `node scripts/prepare-deploy.js`
3. Upload **semua isi** folder **deploy** ke Application root di cPanel

---

## Cara 2: Manual

Setelah `npm run build`:

**Dari `.next/standalone/`** — upload semua isinya ke root Application root:
- `server.js`
- `node_modules/`
- `.next/`
- `package.json`

**Dari `.next/static/`** — copy ke `.next/static/` di server

**Dari `public/`** (jika ada) — copy ke `public/` di server

---

## Yang harus ada di server (root folder aplikasi)

- `server.js`
- `node_modules/`
- `.next/` (termasuk `.next/static/`)
- `package.json`
- `public/` (jika ada)

Jangan upload: `app/`, `components/`, `lib/`, `next.config.js`, source code lain.
