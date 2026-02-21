# Database Strategy — Firma Hukum

## Prinsip

- **Satu database utama** untuk seluruh sistem (mobile + web).
- **Row Level Security (RLS)** untuk akses data berdasarkan role.
- **Soft delete** memakai kolom `deleted_at` di tabel yang perlu audit trail.

---

## 1. Row Level Security (RLS)

- Aktifkan RLS pada tabel yang berisi data sensitif (users, cases, documents, billing, audit, dll).
- Setiap tabel punya **policy** yang membatasi baris yang bisa di-SELECT/INSERT/UPDATE/DELETE menurut **role** user yang menjalankan query.

### Role yang dipakai di policy

| Role        | Scope           | Keterangan                          |
|------------|-----------------|-------------------------------------|
| `partner`  | Semua data      | Full access                         |
| `admin`    | Semua data      | Full access (operasional)           |
| `finance`  | Billing, reports | Invoice, payment, reports           |
| `management` | Read + reports | Monitoring, analytics               |
| `lawyer`   | Case/task/doc milik tim | Per case assignment        |
| `staff`    | Case/task/doc milik tim | Per case assignment        |
| `client`   | Hanya data milik klien | Per case client_id           |

### Pola policy (contoh PostgreSQL)

```sql
-- Contoh: policy pada tabel cases
-- Hanya baris yang "boleh dilihat" oleh current user (role dari JWT/session)

CREATE POLICY cases_select_policy ON cases
  FOR SELECT
  USING (
    (current_setting('app.current_role') IN ('partner', 'admin'))
    OR (current_setting('app.current_role') = 'management' AND true)  -- baca semua
    OR (current_setting('app.current_role') IN ('lawyer', 'staff') AND id IN (
      SELECT case_id FROM case_assignments WHERE user_id = current_setting('app.user_id')
    ))
    OR (current_setting('app.current_role') = 'client' AND client_id = current_setting('app.user_id'))
  );

-- Policy INSERT/UPDATE/DELETE disesuaikan (hanya partner/admin bisa delete, dll)
```

- Sebelum menjalankan query, backend set session variable dari JWT:  
  `SET app.current_role = 'admin'; SET app.user_id = '...';`
- Policy filter **berdasarkan role** (dan bila perlu `user_id` / `case_id`).

---

## 2. Soft Delete (`deleted_at`)

- Tabel yang tidak boleh hilang fisik: tambah kolom **`deleted_at`** (TIMESTAMP NULL).
- **Delete** = UPDATE ... SET deleted_at = NOW(), (updated_at = NOW()).
- **Select** default: selalu filter `WHERE deleted_at IS NULL` (kecuali untuk audit/restore).
- Restore: UPDATE ... SET deleted_at = NULL.

### Tabel yang disarankan pakai soft delete

- `users`
- `cases`
- `documents` (atau document_versions)
- `tasks`
- Lain yang butuh audit / undo

---

## 3. Tabel Tambahan untuk Web

Tabel di bawah ini mendukung modul **Admin Web** (W2–W9). Semua tabel disarankan punya:

- `created_at`, `updated_at` (TIMESTAMP)
- `deleted_at` (TIMESTAMP NULL) bila dipakai soft delete
- RLS policy sesuai role (admin/partner/finance/management).

### 3.1 `system_settings`

Konfigurasi global (W9 System Config, feature toggles, dll).

| Kolom       | Tipe         | Keterangan                |
|------------|--------------|---------------------------|
| id         | UUID PK      |                            |
| key        | VARCHAR(128) UNIQUE | Kunci setting (e.g. `payment_gateway_provider`) |
| value      | JSONB / TEXT | Nilai (flexibel)           |
| category   | VARCHAR(64)  | Grup: payment, email, notification, feature, backup |
| description| TEXT         | Deskripsi untuk admin     |
| created_at | TIMESTAMPTZ  |                            |
| updated_at | TIMESTAMPTZ  |                            |

---

### 3.2 `workflow_templates`

Template alur tugas (W3 Task Workflow).

| Kolom          | Tipe         | Keterangan                    |
|----------------|--------------|-------------------------------|
| id             | UUID PK      |                                |
| name           | VARCHAR(255) | Nama template                 |
| slug           | VARCHAR(128) UNIQUE | Untuk referensi (e.g. `litigation_default`) |
| case_type      | VARCHAR(64)  | Optional: jenis perkara       |
| steps          | JSONB        | Array step: [{ order, name, assignee_role, sla_hours }] |
| is_active      | BOOLEAN DEFAULT true | |
| created_at     | TIMESTAMPTZ  |                                |
| updated_at     | TIMESTAMPTZ  |                                |
| deleted_at     | TIMESTAMPTZ  | Soft delete                   |

---

### 3.3 `retention_policies`

Kebijakan retensi dokumen (W4 Document Management).

| Kolom          | Tipe         | Keterangan                    |
|----------------|--------------|-------------------------------|
| id             | UUID PK      |                                |
| name           | VARCHAR(255) | Nama policy                   |
| document_type  | VARCHAR(64)  | Optional: filter tipe dokumen |
| case_status    | VARCHAR(64)  | Optional: closed, archived    |
| retain_years   | INT          | Lama simpan (tahun)           |
| action_after   | VARCHAR(32)  | archive / delete_soft / notify |
| is_active      | BOOLEAN DEFAULT true | |
| created_at     | TIMESTAMPTZ  |                                |
| updated_at     | TIMESTAMPTZ  |                                |
| deleted_at     | TIMESTAMPTZ  | Soft delete                   |

---

### 3.4 `custom_fields`

Custom field per case type / entity (W9 Custom field builder).

| Kolom       | Tipe         | Keterangan                         |
|------------|--------------|------------------------------------|
| id         | UUID PK      |                                     |
| entity     | VARCHAR(64)  | `case`, `client`, `invoice`, dll   |
| case_type  | VARCHAR(64)  | Optional: hanya untuk jenis perkara tertentu |
| field_key  | VARCHAR(128) | Key (e.g. `contract_value`)        |
| label      | VARCHAR(255) | Label tampilan                     |
| field_type | VARCHAR(32)  | text, number, date, select, json   |
| options    | JSONB        | Untuk select: [{ value, label }]   |
| is_required| BOOLEAN DEFAULT false | |
| sort_order | INT DEFAULT 0 | Urutan tampilan                    |
| created_at | TIMESTAMPTZ  |                                     |
| updated_at | TIMESTAMPTZ  |                                     |
| deleted_at | TIMESTAMPTZ  | Soft delete                        |

- Nilai isian disimpan di tabel terpisah (e.g. `case_custom_field_values`: case_id, custom_field_id, value).

---

### 3.5 `case_risk_scores`

Risk scoring per perkara (W2 Case Management).

| Kolom       | Tipe         | Keterangan                    |
|------------|--------------|-------------------------------|
| id         | UUID PK      |                                |
| case_id    | UUID FK      |                                |
| score      | DECIMAL(5,2) | 0–100 atau skala yang dipakai |
| factors    | JSONB        | Faktor yang mempengaruhi       |
| calculated_at | TIMESTAMPTZ | Terakhir dihitung             |
| created_at | TIMESTAMPTZ  |                                |
| updated_at | TIMESTAMPTZ  |                                |

- Satu baris “terkini” per case (bisa pakai view/latest by calculated_at) atau policy “hanya yang terbaru”.

---

### 3.6 `lawyer_performance_metrics`

Metrik performa lawyer (W5/W6 Billing & Reporting).

| Kolom            | Tipe         | Keterangan                    |
|------------------|--------------|-------------------------------|
| id               | UUID PK      |                                |
| user_id          | UUID FK      | Lawyer                        |
| period_type      | VARCHAR(16)  | month, quarter, year          |
| period_start     | DATE         | Awal periode                  |
| period_end       | DATE         | Akhir periode                 |
| cases_closed     | INT DEFAULT 0 |                               |
| revenue_billed   | DECIMAL(18,2) DEFAULT 0 |       |
| revenue_collected| DECIMAL(18,2) DEFAULT 0 |     |
| utilization_pct  | DECIMAL(5,2) | Persen utilization           |
| avg_case_duration_days | INT  | Rata-rata hari               |
| created_at       | TIMESTAMPTZ  |                                |
| updated_at       | TIMESTAMPTZ  |                                |

- Unique constraint (user_id, period_type, period_start) agar tidak duplikat per periode.

---

## 4. Ringkasan

| Aspek        | Keputusan                                      |
|-------------|-------------------------------------------------|
| Database    | 1 database utama                                |
| Akses       | RLS + policy filter berdasarkan role            |
| Delete      | Soft delete (`deleted_at`) di tabel utama & web  |
| Tabel web   | `system_settings`, `workflow_templates`, `retention_policies`, `custom_fields`, `case_risk_scores`, `lawyer_performance_metrics` |

Implementasi RLS dan session variable (`app.current_role`, `app.user_id`) dilakukan di lapisan backend (API) saat koneksi ke database.
