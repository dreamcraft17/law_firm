/**
 * Admin Web API path grouping.
 * Semua request admin web memakai prefix /admin/<group>/*
 * Base URL: NEXT_PUBLIC_API_BASE_URL. Kalau kosong = backend di repo ini → pakai /api.
 */
const envBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
export const apiBaseUrl =
  envBase && envBase.length > 0
    ? envBase.replace(/\/$/, '')
    : (typeof window !== 'undefined' ? window.location.origin : '') + '/api';

/** Admin API path groups */
export const ApiPaths = {
  /** /admin/users/* */
  users: 'admin/users',

  /** /admin/roles/* */
  roles: 'admin/roles',

  /** /admin/cases/* */
  cases: 'admin/cases',

  /** /admin/documents/* */
  documents: 'admin/documents',

  /** /admin/billing/* */
  billing: 'admin/billing',

  /** /admin/reports/* */
  reports: 'admin/reports',

  /** /admin/settings/* */
  settings: 'admin/settings',

  /** /admin/audit/* */
  audit: 'admin/audit',
} as const;

/** Helper endpoint paths untuk admin web */
export const adminEndpoints = {
  // Users (W1)
  usersList: () => ApiPaths.users,
  userDetail: (id: string) => `${ApiPaths.users}/${id}`,
  userCreate: () => ApiPaths.users,
  userUpdate: (id: string) => `${ApiPaths.users}/${id}`,
  userDelete: (id: string) => `${ApiPaths.users}/${id}`,
  userLoginHistory: (id: string) => `${ApiPaths.users}/${id}/login-history`,
  userForceLogout: (id: string) => `${ApiPaths.users}/${id}/force-logout`,

  // Roles
  rolesList: () => ApiPaths.roles,
  roleDetail: (id: string) => `${ApiPaths.roles}/${id}`,
  rolePermissions: (id: string) => `${ApiPaths.roles}/${id}/permissions`,

  // Cases (W2)
  casesList: () => ApiPaths.cases,
  caseDetail: (id: string) => `${ApiPaths.cases}/${id}`,
  caseCreate: () => ApiPaths.cases,
  caseUpdate: (id: string) => `${ApiPaths.cases}/${id}`,
  caseDelete: (id: string) => `${ApiPaths.cases}/${id}`,
  caseAssignTeam: (id: string) => `${ApiPaths.cases}/${id}/team`,
  caseConflictCheck: () => `${ApiPaths.cases}/conflict-check`,
  caseExportSummary: (id: string) => `${ApiPaths.cases}/${id}/export`,

  // Documents (W4)
  documentsList: () => ApiPaths.documents,
  documentDetail: (id: string) => `${ApiPaths.documents}/${id}`,
  documentsByCase: (caseId: string) => `${ApiPaths.documents}/case/${caseId}`,
  documentBulkUpload: () => `${ApiPaths.documents}/bulk-upload`,

  // Billing (W5)
  billingInvoices: () => `${ApiPaths.billing}/invoices`,
  invoiceDetail: (id: string) => `${ApiPaths.billing}/invoices/${id}`,
  invoiceApprove: (id: string) => `${ApiPaths.billing}/invoices/${id}/approve`,
  billingTaxRates: () => `${ApiPaths.billing}/tax-rates`,
  billingReports: () => `${ApiPaths.billing}/reports`,

  // Reports (W6)
  reportsDashboard: () => `${ApiPaths.reports}/dashboard`,
  reportsExport: (type: string) => `${ApiPaths.reports}/export/${type}`,

  // Settings (W9)
  settingsPaymentGateway: () => `${ApiPaths.settings}/payment-gateway`,
  settingsEmailTemplates: () => `${ApiPaths.settings}/email-templates`,
  settingsNotificationRules: () => `${ApiPaths.settings}/notification-rules`,
  settingsCaseTypes: () => `${ApiPaths.settings}/case-types`,
  settingsFeatureToggles: () => `${ApiPaths.settings}/feature-toggles`,

  // Audit (W7)
  auditLogs: () => ApiPaths.audit,
  auditLogsFilter: (params: { user?: string; case?: string }) => {
    const p = new URLSearchParams();
    if (params.user) p.set('user', params.user);
    if (params.case) p.set('case', params.case);
    const q = p.toString();
    return q ? `${ApiPaths.audit}?${q}` : ApiPaths.audit;
  },
  auditExport: () => `${ApiPaths.audit}/export`,
} as const;
