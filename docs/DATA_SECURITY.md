# Keamanan Data (Data Security)

## Enkripsi at rest (database)

- **Rekomendasi:** Gunakan penyedia database (mis. AWS RDS, Supabase, Neon) dengan enkripsi at rest yang diaktifkan.
- PostgreSQL: banyak penyedia mengaktifkan encryption at rest secara default atau via opsi (e.g. `storage_encryption`).
- Aplikasi tidak mengelola enkripsi DB; tanggung jawab di lapisan infrastruktur.

## Backup terenkripsi

- **Rekomendasi:** Saat melakukan backup (pg_dump, snapshot, dll.):
  - Simpan backup di storage yang mengenkripsi (S3 dengan SSE, backup provider dengan encryption).
  - Untuk backup file, enkripsi file backup (e.g. GPG, 7z dengan password) sebelum menyimpan atau mengirim.
- Jadwalkan backup rutin dan uji restore secara berkala.

## Data sensitif di aplikasi

- Password pengguna: hanya disimpan sebagai hash (bcrypt); tidak pernah plain text.
- Token session: disimpan di DB; pastikan akses DB dibatasi (IAM, VPN, private subnet).
- Dokumen: URL file disimpan di DB; file disimpan di Vercel Blob atau disk—pastikan akses baca dibatasi (signed URL jika perlu).

## Compliance

- Audit log mencatat: login, login_failed, permission_change, user_role_change, conflict.override, signing_completed, access_denied_ip.
- Password policy: panjang minimal, kompleksitas, history (no reuse); opsional expiry via `User.passwordExpiresAt`.
- Session: batas session bersamaan per user; timeout via `expiresAt` dan `lastActiveAt`.
