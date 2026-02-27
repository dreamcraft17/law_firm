# Alur Testing — Sisi Web (Admin Panel)

Dokumen ini menjelaskan **alur testing** untuk aplikasi **admin-web** (panel admin firma hukum): prasyarat, checklist manual per modul, dan panduan testing terotomasi.

---

## 1. Prasyarat

Sebelum menjalankan testing, pastikan:

| Item | Keterangan |
|------|-------------|
| **Node.js** | v18+ (disarankan LTS) |
| **Database** | PostgreSQL sudah jalan; migrasi Prisma sudah dijalankan (`npm run db:migrate` atau `npx prisma migrate deploy`) |
| **Env** | File `.env` atau `.env.local` berisi `DATABASE_URL`, dan jika pakai API terpisah: `NEXT_PUBLIC_API_BASE_URL` |
| **Seed (opsional)** | Untuk testing RBAC/role: `npm run db:seed-rbac` |

Menjalankan aplikasi:

```bash
cd admin-web
npm install
npm run dev
```

Buka **http://localhost:3000**. Halaman login harus tampil.

---

## 2. Alur Testing Manual

### 2.1 Login & Autentikasi

| No | Langkah | Hasil yang diharapkan |
|----|---------|------------------------|
| 1 | Buka `/login` | Form login tampil (email, password) |
| 2 | Submit dengan email/password kosong atau invalid | Pesan error tampil; tidak redirect |
| 3 | Submit dengan kredensial valid (user yang ada di DB + role) | Redirect ke `/dashboard`; token tersimpan (localStorage) |
| 4 | Setelah login, buka langsung URL `/dashboard` | Dashboard tampil (tidak redirect ke login) |
| 5 | Logout (jika ada menu logout) lalu buka `/dashboard` | Redirect ke `/login` |
| 6 | Token kadaluarsa / invalid | Request API 401; redirect atau pesan "session expired" sesuai implementasi |

**Checklist singkat:** Form tampil → Error invalid → Login sukses → Redirect → Akses halaman terproteksi → Logout/invalid token.

---

### 2.2 Dashboard

| No | Langkah | Hasil yang diharapkan |
|----|---------|------------------------|
| 1 | Login lalu masuk ke `/dashboard` | Dashboard tampil; tidak error 404/500 |
| 2 | Cek widget/statistik (jika ada) | Data tampil atau placeholder "0" / loading lalu angka |
| 3 | Cek navigasi sidebar | Semua menu sesuai role tampil; link mengarah ke rute yang benar |

---

### 2.3 Perkara (Cases) — W2

| No | Langkah | Hasil yang diharapkan |
|----|---------|------------------------|
| 1 | Buka `/cases` | Daftar perkara tampil (atau kosong); filter/stage tampil |
| 2 | Filter by stage (intake/active/on_hold/closed) | Daftar ter-filter sesuai stage |
| 3 | Klik "Buat perkara" / form tambah | Form modal atau halaman form tampil |
| 4 | Isi form (title, client, deskripsi, stage) lalu simpan | Data tersimpan; muncul di list; tidak error |
| 5 | Edit satu perkara | Form terisi; simpan berhasil; list ter-update |
| 6 | Hapus satu perkara (jika ada soft delete: status/archived) | Perkara hilang dari list atau status berubah sesuai desain |
| 7 | Export (CSV/JSON jika ada) | File terunduh; isi sesuai data yang tampil |
| 8 | Simpan view / filter (jika ada) | View tersimpan; bisa dipilih lagi |

---

### 2.4 Task (W3)

| No | Langkah | Hasil yang diharapkan |
|----|---------|------------------------|
| 1 | Buka `/tasks` | Daftar task tampil; bisa filter by case |
| 2 | Buat task baru (judul, case, due date, assignee jika ada) | Task tersimpan; tampil di list |
| 3 | Ubah status task | Status ter-update |
| 4 | Hapus task (jika diizinkan) | Task hilang atau status "cancelled" |

---

### 2.5 Dokumen (W4)

| No | Langkah | Hasil yang diharapkan |
|----|---------|------------------------|
| 1 | Buka `/documents` | Daftar dokumen tampil; filter per case |
| 2 | Upload dokumen (per case) | Upload sukses; dokumen tampil di list |
| 3 | Bulk upload (jika ada) | Beberapa file ter-upload; tampil per case |
| 4 | Download / preview | File terbuka atau terunduh |

---

### 2.6 Billing (W5)

| No | Langkah | Hasil yang diharapkan |
|----|---------|------------------------|
| 1 | Buka `/billing` | Daftar invoice/billing tampil |
| 2 | Buat invoice (draft) | Invoice tersimpan; status draft |
| 3 | Edit invoice; ubah status (sent/partial_paid/paid) | Perubahan tersimpan |
| 4 | Export / laporan (jika ada) | Data ter-export sesuai filter |

---

### 2.7 User & Role (W1)

| No | Langkah | Hasil yang diharapkan |
|----|---------|------------------------|
| 1 | Buka `/users` | Daftar user tampil |
| 2 | Tambah user (email, nama, role, firm jika multi-tenant) | User tersimpan; tampil di list |
| 3 | Edit user (nama, role) | Perubahan tersimpan |
| 4 | Buka `/roles` | Daftar role dan permission tampil |
| 5 | Edit permission per role (jika ada UI) | Permission ter-update; user dengan role tersebut dapat akses sesuai |

---

### 2.8 Pengaturan (Settings) — W9

| No | Langkah | Hasil yang diharapkan |
|----|---------|------------------------|
| 1 | Buka `/settings` | Halaman pengaturan tampil (firm config, numbering, 2FA, dll. sesuai fitur) |
| 2 | Ubah salah satu seting (mis. prefix nomor perkara) | Simpan berhasil; nilai ter-update |

---

### 2.9 Audit (W7)

| No | Langkah | Hasil yang diharapkan |
|----|---------|------------------------|
| 1 | Buka `/audit` | Daftar audit log tampil |
| 2 | Filter by user / date / action | Hasil ter-filter |
| 3 | Export audit (jika ada) | File terunduh |

---

### 2.10 Laporan (W6)

| No | Langkah | Hasil yang diharapkan |
|----|---------|------------------------|
| 1 | Buka `/reports` | Laporan/grafik tampil |
| 2 | Pilih periode / filter | Data berubah sesuai filter |
| 3 | Export (jika ada) | File terunduh |

---

### 2.11 Lead / Intake (M4)

| No | Langkah | Hasil yang diharapkan |
|----|---------|------------------------|
| 1 | Buka `/leads` | Daftar lead tampil |
| 2 | Tambah lead; isi sumber, kategori, ringkasan | Lead tersimpan |
| 3 | Konversi lead → case (jika ada) | Case + client terbuat; lead ter-link |

---

### 2.12 Events & Knowledge Base

| Halaman | Checklist singkat |
|---------|--------------------|
| `/events` | List event tampil; bisa tambah/edit/hapus event (sesuai fitur) |
| `/knowledge-base` | Konten KB/template tampil; bisa cari/tambah/edit (sesuai fitur) |

---

## 3. Testing per Role (RBAC)

Jika seed RBAC dijalankan, ada role: **admin**, **lawyer**, **staff**, **client**. Untuk setiap role:

1. Login dengan user yang punya role tersebut.
2. Buka setiap menu yang **seharusnya bisa** diakses → halaman tampil, tidak 403.
3. Buka URL yang **tidak diizinkan** (jika ada proteksi) → 403 atau redirect.
4. Cek permission spesifik: mis. lawyer tidak bisa akses "kelola user", staff tidak bisa akses "approve invoice", dll.

---

## 4. Testing Terotomasi (Rekomendasi)

### 4.1 Unit / Component (Vitest)

- **Lokasi:** File `*.test.ts` atau `*.spec.ts` (mis. `lib/api-paths.test.ts`).
- **Jalankan:**
  - Satu kali: `npm run test`
  - Watch mode: `npm run test:watch`
- **Konfigurasi:** `vitest.config.ts` (environment: jsdom, path alias `@/`).
- **Cakupan:** Utility (api-paths, format date, permission check), nantinya bisa ditambah React Testing Library untuk komponen.

Contoh skenario:
- Komponen tombol: render, klik, callback terpanggil.
- Helper `api-paths`: hasil URL sesuai base URL dan path.
- Halaman login: render form; submit dengan data invalid menampilkan error.

### 4.2 E2E (Playwright atau Cypress)

- **Lokasi:** `e2e/` atau `tests/e2e/`.
- **Jalankan:** `npm run test:e2e` (setelah konfigurasi).
- **Cakupan:** Alur kritis: login → dashboard, buat perkara, buat task, upload dokumen, buat invoice.

Lingkungan:
- Gunakan DB test terpisah atau seed khusus (user test + data minimal).
- Base URL: `http://localhost:3000` (dev server jalan saat e2e).

---

## 5. Checklist Cepat Sebelum Release

- [ ] Login dengan kredensial valid berhasil.
- [ ] Semua menu yang seharusnya tampil bisa dibuka tanpa error.
- [ ] CRUD minimal untuk Cases, Tasks, Documents, Billing, Users berjalan.
- [ ] Filter dan export (jika ada) berfungsi.
- [ ] Role/permission: akses sesuai role; akses dilarang mengembalikan 403/redirect.
- [ ] Build production sukses: `npm run build`.
- [ ] Tidak ada error di konsol browser untuk halaman utama (login, dashboard, cases, tasks).

---

## 6. Referensi

- **Fitur & modul:** `docs/FITUR_DAN_MODUL.md` (di root project).
- **Setup & deploy:** `docs/STACK_AND_DEPLOY.md`, `docs/R0_SETUP.md`.
- **API:** Endpoint admin di `/api/admin/[[...path]]`; path sesuai `lib/api-paths.ts`.
