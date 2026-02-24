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

  /** /admin/clients/* (M1) */
  clients: 'admin/clients',

  /** /admin/cases/* */
  cases: 'admin/cases',

  /** /admin/documents/* */
  documents: 'admin/documents',

  /** /admin/tasks/* */
  tasks: 'admin/tasks',

  /** /admin/time-entries/* (M2) */
  timeEntries: 'admin/time-entries',

  /** /admin/expenses/* (M3) */
  expenses: 'admin/expenses',

  /** /admin/rate-cards/* */
  rateCards: 'admin/rate-cards',

  /** /admin/billing/* */
  billing: 'admin/billing',

  /** /admin/reports/* */
  reports: 'admin/reports',

  /** /admin/settings/* */
  settings: 'admin/settings',

  /** /admin/audit/* */
  audit: 'admin/audit',

  /** /admin/auth/* (login) */
  auth: 'admin/auth',

  /** /admin/permissions (GET list) */
  permissions: 'admin/permissions',

  /** /admin/knowledge-base/* (W8) */
  knowledgeBase: 'admin/knowledge-base',
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

  // Auth (R0.1)
  authLogin: () => `${ApiPaths.auth}/login`,

  // Roles & Permissions
  rolesList: () => ApiPaths.roles,
  roleDetail: (id: string) => `${ApiPaths.roles}/${id}`,
  rolePermissions: (id: string) => `${ApiPaths.roles}/${id}/permissions`,
  permissionsList: () => ApiPaths.permissions,

  // Clients (M1)
  clientsList: () => ApiPaths.clients,
  clientDetail: (id: string) => `${ApiPaths.clients}/${id}`,
  clientContacts: (id: string) => `${ApiPaths.clients}/${id}/contacts`,
  clientCreate: () => ApiPaths.clients,
  clientUpdate: (id: string) => `${ApiPaths.clients}/${id}`,
  clientDelete: (id: string) => `${ApiPaths.clients}/${id}`,

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
  documentUpload: () => `${ApiPaths.documents}/upload`,

  // Tasks (W3)
  tasksList: () => ApiPaths.tasks,
  taskDetail: (id: string) => `${ApiPaths.tasks}/${id}`,
  taskCreate: () => ApiPaths.tasks,
  taskUpdate: (id: string) => `${ApiPaths.tasks}/${id}`,
  taskDelete: (id: string) => `${ApiPaths.tasks}/${id}`,
  tasksByCase: (caseId: string) => `${ApiPaths.tasks}/case/${caseId}`,

  // Time entries (M2)
  timeEntriesList: () => ApiPaths.timeEntries,
  timeEntriesByCase: (caseId: string) => `${ApiPaths.timeEntries}/case/${caseId}`,
  timeEntryDetail: (id: string) => `${ApiPaths.timeEntries}/${id}`,
  timeEntryApprove: (id: string) => `${ApiPaths.timeEntries}/${id}/approve`,

  // Expenses (M3)
  expensesList: () => ApiPaths.expenses,
  expensesByCase: (caseId: string) => `${ApiPaths.expenses}/case/${caseId}`,
  expenseDetail: (id: string) => `${ApiPaths.expenses}/${id}`,
  expenseApprove: (id: string) => `${ApiPaths.expenses}/${id}/approve`,

  // Rate cards
  rateCardsList: () => ApiPaths.rateCards,
  rateCardDetail: (id: string) => `${ApiPaths.rateCards}/${id}`,

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

  // Knowledge Base (W8)
  knowledgeBaseList: () => ApiPaths.knowledgeBase,
  knowledgeBaseDetail: (key: string) => `${ApiPaths.knowledgeBase}/${key}`,
  knowledgeBaseCreate: () => ApiPaths.knowledgeBase,
  knowledgeBaseUpdate: (key: string) => `${ApiPaths.knowledgeBase}/${key}`,
  knowledgeBaseDelete: (key: string) => `${ApiPaths.knowledgeBase}/${key}`,
} as const;
