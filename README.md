# Admin Web Panel — Firma Hukum

Next.js 14 + React + TypeScript + Tailwind. Target: Partner, Admin, Finance, Management.

## Relasi dengan project lain

- **admin-web** (repo ini) = **panel web admin** — sisi operasional untuk mengelola users, cases, billing, dokumen, audit, dll. Panel ini memanggil API dengan prefix **`/admin/*`** (base URL lewat env `NEXT_PUBLIC_API_BASE_URL`).
- **law_firm** = aplikasi **Flutter (mobile)** untuk pengguna/klien — memanggil API dengan prefix **`/mobile/*`** (base URL lewat `API_BASE_URL` di Flutter).

Keduanya memakai **satu backend API** yang sama: endpoint **`/mobile/*`** untuk app Flutter, **`/admin/*`** untuk admin web. Jadi admin-web adalah “sisi admin” / backend-admin dari sistem yang dipakai juga oleh aplikasi Flutter law_firm (data users, cases, tasks, documents, dll. dikelola lewat panel ini).

## Modul (W1–W9)

- **W1** User & Role Management — create/edit/delete user, assign role, permission, login history, force logout
- **W2** Full Case Management — create/edit/delete case, assign team, conflict check, risk scoring, export
- **W3** Task Workflow — template builder, workflow automation, SLA dashboard, bulk assign, analytics
- **W4** Document Management — folder control, bulk upload, version compare, legal hold, retention, storage
- **W5** Billing & Finance — invoice, approve, tax, multi-currency, retainer, expense, reconciliation, reports
- **W6** Reporting & Analytics — dashboard (active/closed cases, revenue, utilization, aging, success rate)
- **W7** Audit & Compliance — audit logs, filter by user/case, export, legal hold, GDPR/PDPA export
- **W8** Knowledge Base — document template, clause library, precedent, legal research, tagging
- **W9** System Config — payment gateway, email template, notification rules, case type, custom field, backup, feature toggles

## Menjalankan

```bash
cd "E:\project pirbadi\baru\admin-web"
npm install
npm run dev
```

Buka http://localhost:3000 → Login → Dashboard dan menu samping untuk tiap modul.

## Web API grouping

Endpoint backend untuk admin web memakai prefix `/admin/<group>/*`:

| Group      | Prefix             | Pakai di modul        |
|-----------|--------------------|------------------------|
| users     | `/admin/users/*`   | W1 User & Role        |
| roles     | `/admin/roles/*`   | W1 Roles & Permission |
| cases     | `/admin/cases/*`   | W2 Case Management   |
| documents | `/admin/documents/*` | W4 Document Mgmt   |
| billing   | `/admin/billing/*` | W5 Billing & Finance |
| reports   | `/admin/reports/*` | W6 Reporting         |
| settings  | `/admin/settings/*` | W9 System Config    |
| audit     | `/admin/audit/*`   | W7 Audit & Compliance |

- Path & helper: `lib/api-paths.ts` (`ApiPaths`, `adminEndpoints`).
- Base URL: env `NEXT_PUBLIC_API_BASE_URL` (default: `https://api.example-firm.com`).
- Client: `lib/api-client.ts` → `adminFetch(path, options)`; token dari `localStorage.admin_token`.
