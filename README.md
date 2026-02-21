# Admin Web Panel — Firma Hukum

Next.js 14 + React + TypeScript + Tailwind. Target: Partner, Admin, Finance, Management.

## Relasi dengan project lain

- **admin-web** (repo ini) = **panel admin** + **backend API** (Next.js + Prisma). Panel memanggil **`/api/admin/*`**; app Flutter memanggil **`/api/mobile/*`**. Satu deploy (mis. Vercel) melayani keduanya.
- **law_firm** = aplikasi **Flutter (mobile)** — set `API_BASE_URL` ke URL deploy admin-web + `/api` (mis. `https://xxx.vercel.app/api`).

Backend ada di repo ini: route **`/api/admin/*`** dan **`/api/mobile/*`**, Prisma ke PostgreSQL (mis. Railway).

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
- Base URL: env `NEXT_PUBLIC_API_BASE_URL`. Kosong = pakai same-origin **`/api`** (backend di repo ini).
- Client: `lib/api-client.ts` → `adminFetch(path, options)`; token dari `localStorage.admin_token`.
