# R0 — Security & Access Control (Setup)

## Yang sudah diimplementasi

### R0.1 RBAC + Permission Matrix
- **DB:** `roles`, `permissions`, `role_permissions`, `sessions`; kolom `users.role_id`, `users.client_id`.
- **API Admin:**
  - `GET /api/admin/roles` — daftar role (dengan _count permissions & users).
  - `POST /api/admin/roles` — buat role (body: `{ name }`).
  - `GET /api/admin/roles/:id` — detail role + permissions.
  - `PUT /api/admin/roles/:id/permissions` — set permissions (body: `{ permissionIds: string[] }`).
  - `GET /api/admin/permissions` — daftar semua permission.
  - `POST /api/admin/auth/login` — login admin (body: `email`, `password`); response: `access_token`, `user`, `roleId`, `permissions`.
- **Token & permission:** Semua endpoint admin (kecuali `auth/login`) memerlukan header `Authorization: Bearer <token>`. Permission dicek per grup aksi (users.view, cases.view, roles.manage, dll). User dengan `role === 'admin'` atau permission `admin.see_all` dianggap full access.
- **Halaman:** **Roles & Permissions** (`/roles`) — list role, tambah role, edit permissions per role.

### R0.2 Row-Level Access (Case Team / Client)
- **Mobile:** `GET /api/mobile/cases` dan `GET /api/mobile/cases/:id` memfilter berdasarkan:
  - **Admin** (permission `admin.see_all`): lihat semua case.
  - **Client** (`user.clientId`): hanya case dengan `case.clientId === user.clientId`.
  - **Lawyer/Staff:** hanya case di mana user ada di `case_team_members`.
- Tasks & documents mobile juga dibatasi oleh akses case (harus punya akses ke case terkait).
- Response 403 jika akses ke case/detail ditolak.

## Langkah deploy / first-time

1. **Jalankan migrasi** (tabel roles, permissions, role_permissions, sessions, kolom users.role_id & users.client_id):
   ```bash
   npx prisma migrate deploy
   ```
   Atau jalankan SQL di `prisma/migrations/20250224100000_add_rbac_and_sessions/migration.sql` secara manual jika perlu.

2. **Seed roles & permissions** (default: admin, lawyer, staff, client + 30+ permission keys):
   ```bash
   npm run db:seed-rbac
   ```
   Seed juga mengisi `users.role_id` dari `users.role` yang sudah ada.

3. **Login admin:** Halaman login memanggil `POST /api/admin/auth/login`. Simpan `access_token` di localStorage (`admin_token`). Response berisi `roleId` dan `permissions`.

4. **User baru / assign role:** Di **User & Role**, saat edit user bisa isi `roleId` (UUID dari GET /admin/roles). Atau tetap pakai field `role` (string) untuk backward compat; seed sudah sync roleId dari role name.

5. **Mobile:** Login mobile (`POST /api/mobile/auth/login`) sekarang mengembalikan `roleId` dan `permissions`, dan membuat session di DB. Setiap request mobile ke cases/tasks/documents harus menyertakan `Authorization: Bearer <access_token>`; akses case dibatasi row-level seperti di atas.
