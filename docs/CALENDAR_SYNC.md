# Sinkronisasi Kalender (Google / Outlook)

## Arsitektur

- **OAuth2:** Simpan `access_token` dan `refresh_token` lawyer di tabel `user_calendar_connections` (per user + provider). Enkripsi token di aplikasi sebelum simpan jika diperlukan.
- **Mapping ID:** Kolom `events.provider_event_id` menyimpan ID event dari Google/Outlook agar perubahan di salah satu sisi bisa di-match.
- **Sync Service (Worker):** Gunakan PM2 atau Vercel Cron untuk job yang:
  - Refresh token yang kedaluwarsa.
  - Push event baru (saat tim buat Event di admin-web) ke Google Calendar API dengan `events.insert`; simpan returned `id` ke `provider_event_id`.
  - Periodic sync: baca perubahan dari provider dan update event lokal.
- **Webhook Listener:** `POST /api/webhooks/calendar` menerima notifikasi dari Google (Push) atau Outlook saat event berubah di kalender lawyer. Verifikasi signature; lookup event by `provider_event_id` dan update `start_at`/`end_at`/`title` di DB.
- **Conflict Handling:** Sebelum create/update event di admin-web, opsional: panggil provider API untuk list events dalam rentang waktu; jika ada bentrok dengan jadwal pribadi lawyer (yang tidak punya `provider_event_id` di sistem), tampilkan peringatan di admin-web.

## Alur singkat

1. **Create Event (admin-web):** Backend create row di `events`; jika lawyer punya `user_calendar_connections` untuk Google/Outlook, panggil provider API untuk insert event → simpan `provider_event_id`.
2. **Update/Delete:** Sync ke provider menggunakan `provider_event_id`; update atau delete event di kalender eksternal.
3. **Inbound (webhook):** Provider mengirim notifikasi → endpoint update event lokal sesuai perubahan di kalender.

## Env (contoh)

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` untuk OAuth.
- `WEBHOOK_CALENDAR_SECRET` untuk verifikasi payload webhook.
