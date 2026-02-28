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

  /** /admin/leads/* (M4 Intake & Lead) */
  leads: 'admin/leads',

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

  /** /admin/notification-rules (W9) */
  notificationRules: 'admin/notification-rules',

  /** /admin/approvals (Client Portal) */
  approvals: 'admin/approvals',

  /** /admin/search (global search) */
  search: 'admin/search',

  /** /admin/saved-views */
  savedViews: 'admin/saved-views',

  /** /admin/document-templates (W4+) */
  documentTemplates: 'admin/document-templates',

  /** /admin/trust-accounts (W5+ retainer) */
  trustAccounts: 'admin/trust-accounts',

  /** /admin/rate-rules (W5+ rate per case/activity) */
  rateRules: 'admin/rate-rules',

  /** /admin/credit-notes (W5+) */
  creditNotes: 'admin/credit-notes',

  /** /admin/recurring-task-templates (W7 workflow) */
  recurringTaskTemplates: 'admin/recurring-task-templates',

  /** /admin/events (calendar + case/task link) */
  events: 'admin/events',

  /** /admin/firms (enterprise multi-tenant) */
  firms: 'admin/firms',

  /** /admin/firm-configs (per-firm config) */
  firmConfigs: 'admin/firm-configs',

  /** /admin/sessions (device list, revoke) */
  sessions: 'admin/sessions',

  /** /admin/export (data export / retention) */
  export: 'admin/export',
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

  // Auth (R0.1) + 2FA
  authLogin: () => `${ApiPaths.auth}/login`,
  authTotpSetup: () => `${ApiPaths.auth}/totp/setup`,
  authTotpEnable: () => `${ApiPaths.auth}/totp/enable`,
  authTotpDisable: () => `${ApiPaths.auth}/totp/disable`,

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
  clientCheckDuplicates: (params?: { name?: string; email?: string; npwp?: string }) => {
    const p = new URLSearchParams();
    if (params?.name) p.set('name', params.name);
    if (params?.email) p.set('email', params.email);
    if (params?.npwp) p.set('npwp', params.npwp);
    const q = p.toString();
    return q ? `${ApiPaths.clients}/check-duplicates?${q}` : `${ApiPaths.clients}/check-duplicates`;
  },

  // Leads (M4)
  leadsList: () => ApiPaths.leads,
  leadDetail: (id: string) => `${ApiPaths.leads}/${id}`,
  leadCreate: () => ApiPaths.leads,
  leadUpdate: (id: string) => `${ApiPaths.leads}/${id}`,
  leadDelete: (id: string) => `${ApiPaths.leads}/${id}`,
  leadConvert: (id: string) => `${ApiPaths.leads}/${id}/convert`,
  leadChecklist: (id: string) => `${ApiPaths.leads}/${id}/checklist`,
  leadConflictCheck: () => `${ApiPaths.leads}/conflict-check`,
  leadConsultation: (id: string) => `${ApiPaths.leads}/${id}/consultation`,

  // Case milestones (W7)
  caseMilestones: (caseId: string) => `${ApiPaths.cases}/${caseId}/milestones`,
  caseMilestoneDetail: (caseId: string, milestoneId: string) => `${ApiPaths.cases}/${caseId}/milestones/${milestoneId}`,

  // Cases (W2) — with filters
  casesList: (params?: { stage?: string; clientId?: string; assigneeId?: string; from?: string; to?: string }) => {
    const p = new URLSearchParams();
    if (params?.stage) p.set('stage', params.stage);
    if (params?.clientId) p.set('clientId', params.clientId);
    if (params?.assigneeId) p.set('assigneeId', params.assigneeId);
    if (params?.from) p.set('from', params.from);
    if (params?.to) p.set('to', params.to);
    const q = p.toString();
    return q ? `${ApiPaths.cases}?${q}` : ApiPaths.cases;
  },
  caseDetail: (id: string) => `${ApiPaths.cases}/${id}`,
  caseCreate: () => ApiPaths.cases,
  caseConflictCheck: () => `${ApiPaths.cases}/conflict-check`,
  caseConflictOverride: (id: string) => `${ApiPaths.cases}/${id}/conflict-override`,
  caseUpdate: (id: string) => `${ApiPaths.cases}/${id}`,
  caseDelete: (id: string) => `${ApiPaths.cases}/${id}`,
  caseAssignTeam: (id: string) => `${ApiPaths.cases}/${id}/team`,
  caseConflictCheck: () => `${ApiPaths.cases}/conflict-check`,
  caseExportSummary: (id: string) => `${ApiPaths.cases}/${id}/export`,
  caseAccess: (caseId: string) => `${ApiPaths.cases}/${caseId}/access`,
  caseAccessUser: (caseId: string, userId: string) => `${ApiPaths.cases}/${caseId}/access/${userId}`,

  // Search & Saved views
  search: (params?: { q?: string; types?: string; limit?: number }) => {
    const p = new URLSearchParams();
    if (params?.q) p.set('q', params.q);
    if (params?.types) p.set('types', params.types);
    if (params?.limit) p.set('limit', String(params.limit));
    const q = p.toString();
    return q ? `${ApiPaths.search}?${q}` : ApiPaths.search;
  },
  savedViewsList: () => ApiPaths.savedViews,
  savedViewDetail: (id: string) => `${ApiPaths.savedViews}/${id}`,
  savedViewCreate: () => ApiPaths.savedViews,
  savedViewUpdate: (id: string) => `${ApiPaths.savedViews}/${id}`,
  savedViewDelete: (id: string) => `${ApiPaths.savedViews}/${id}`,

  // Document templates (W4+)
  documentTemplatesList: () => ApiPaths.documentTemplates,
  documentTemplateDetail: (id: string) => `${ApiPaths.documentTemplates}/${id}`,
  documentTemplateCreate: () => ApiPaths.documentTemplates,
  documentTemplateUpdate: (id: string) => `${ApiPaths.documentTemplates}/${id}`,
  documentTemplateDelete: (id: string) => `${ApiPaths.documentTemplates}/${id}`,

  // Documents (W4)
  documentsList: (params?: { caseId?: string; clientVisible?: string; folder?: string }) => {
    const p = new URLSearchParams();
    if (params?.caseId) p.set('caseId', params.caseId);
    if (params?.clientVisible !== undefined) p.set('clientVisible', params.clientVisible);
    if (params?.folder) p.set('folder', params.folder);
    const q = p.toString();
    return q ? `${ApiPaths.documents}?${q}` : ApiPaths.documents;
  },
  documentDetail: (id: string) => `${ApiPaths.documents}/${id}`,
  documentsByCase: (caseId: string, params?: { folder?: string }) => {
    const p = new URLSearchParams();
    if (params?.folder) p.set('folder', params.folder);
    const q = p.toString();
    return q ? `${ApiPaths.documents}/case/${caseId}?${q}` : `${ApiPaths.documents}/case/${caseId}`;
  },
  documentCheckOut: (id: string) => `${ApiPaths.documents}/${id}/check-out`,
  documentCheckIn: (id: string) => `${ApiPaths.documents}/${id}/check-in`,
  documentAuditLog: (id: string) => `${ApiPaths.documents}/${id}/audit-log`,
  documentGenerateFromTemplate: () => `${ApiPaths.documents}/generate-from-template`,
  documentSendForSignature: (id: string) => `${ApiPaths.documents}/${id}/send-for-signature`,
  documentSigningRequestCreate: (id: string) => `${ApiPaths.documents}/${id}/signing-request`,
  documentSigningRequestGet: (id: string) => `${ApiPaths.documents}/${id}/signing-request`,
  documentSigningRequestSign: (id: string) => `${ApiPaths.documents}/${id}/signing-request/sign`,
  documentBulkUpload: () => `${ApiPaths.documents}/bulk-upload`,
  documentUpload: () => `${ApiPaths.documents}/upload`,

  // Task dependencies (W7)
  taskDependencies: (taskId: string) => `${ApiPaths.tasks}/${taskId}/dependencies`,
  taskDependencyDetail: (taskId: string, depId: string) => `${ApiPaths.tasks}/${taskId}/dependencies/${depId}`,

  // Tasks (W3) — with filters
  tasksList: (params?: { caseId?: string; assigneeId?: string; status?: string; from?: string; to?: string }) => {
    const p = new URLSearchParams();
    if (params?.caseId) p.set('caseId', params.caseId);
    if (params?.assigneeId) p.set('assigneeId', params.assigneeId);
    if (params?.status) p.set('status', params.status);
    if (params?.from) p.set('from', params.from);
    if (params?.to) p.set('to', params.to);
    const q = p.toString();
    return q ? `${ApiPaths.tasks}?${q}` : ApiPaths.tasks;
  },
  taskDetail: (id: string) => `${ApiPaths.tasks}/${id}`,
  taskCreate: () => ApiPaths.tasks,
  taskUpdate: (id: string) => `${ApiPaths.tasks}/${id}`,
  taskDelete: (id: string) => `${ApiPaths.tasks}/${id}`,
  tasksByCase: (caseId: string) => `${ApiPaths.tasks}/case/${caseId}`,

  // Time entries (M2)
  timeEntriesList: () => ApiPaths.timeEntries,
  timeEntriesByCase: (caseId: string) => `${ApiPaths.timeEntries}/case/${caseId}`,
  timeEntryDetail: (id: string) => `${ApiPaths.timeEntries}/${id}`,
  timeEntryUpdate: (id: string) => `${ApiPaths.timeEntries}/${id}`,
  timeEntryApprove: (id: string) => `${ApiPaths.timeEntries}/${id}/approve`,

  // Expenses (M3)
  expensesList: () => ApiPaths.expenses,
  expensesByCase: (caseId: string) => `${ApiPaths.expenses}/case/${caseId}`,
  expenseDetail: (id: string) => `${ApiPaths.expenses}/${id}`,
  expenseApprove: (id: string) => `${ApiPaths.expenses}/${id}/approve`,

  // Rate cards
  rateCardsList: () => ApiPaths.rateCards,
  rateCardDetail: (id: string) => `${ApiPaths.rateCards}/${id}`,

  // Billing (W5) — with filters + write-off
  billingInvoices: (params?: { status?: string; clientId?: string; from?: string; to?: string }) => {
    const p = new URLSearchParams();
    if (params?.status) p.set('status', params.status);
    if (params?.clientId) p.set('clientId', params.clientId);
    if (params?.from) p.set('from', params.from);
    if (params?.to) p.set('to', params.to);
    const q = p.toString();
    return q ? `${ApiPaths.billing}/invoices?${q}` : `${ApiPaths.billing}/invoices`;
  },
  invoiceDetail: (id: string) => `${ApiPaths.billing}/invoices/${id}`,
  invoiceFromTimeEntries: () => `${ApiPaths.billing}/invoices/from-time-entries`,
  invoiceApprove: (id: string) => `${ApiPaths.billing}/invoices/${id}/approve`,
  invoiceWriteOff: (id: string) => `${ApiPaths.billing}/invoices/${id}/write-off`,
  billingTaxRates: () => `${ApiPaths.billing}/tax-rates`,
  billingReports: () => `${ApiPaths.billing}/reports`,

  // Trust accounts (W5+ retainer)
  trustAccountsList: () => ApiPaths.trustAccounts,
  trustAccountByClient: (clientId: string) => `${ApiPaths.trustAccounts}/${clientId}`,

  // Rate rules (W5+)
  rateRulesList: (params?: { caseId?: string; userId?: string }) => {
    const p = new URLSearchParams();
    if (params?.caseId) p.set('caseId', params.caseId);
    if (params?.userId) p.set('userId', params.userId);
    const q = p.toString();
    return q ? `${ApiPaths.rateRules}?${q}` : ApiPaths.rateRules;
  },
  rateRuleDetail: (id: string) => `${ApiPaths.rateRules}/${id}`,
  rateRuleCreate: () => ApiPaths.rateRules,
  rateRuleUpdate: (id: string) => `${ApiPaths.rateRules}/${id}`,
  rateRuleDelete: (id: string) => `${ApiPaths.rateRules}/${id}`,

  // Credit notes (W5+)
  creditNotesList: (params?: { invoiceId?: string }) => {
    const p = new URLSearchParams();
    if (params?.invoiceId) p.set('invoiceId', params.invoiceId);
    const q = p.toString();
    return q ? `${ApiPaths.creditNotes}?${q}` : ApiPaths.creditNotes;
  },
  creditNoteDetail: (id: string) => `${ApiPaths.creditNotes}/${id}`,
  creditNoteCreate: () => ApiPaths.creditNotes,
  creditNoteUpdate: (id: string) => `${ApiPaths.creditNotes}/${id}`,
  creditNoteDelete: (id: string) => `${ApiPaths.creditNotes}/${id}`,

  // Recurring task templates (W7)
  recurringTaskTemplatesList: (params?: { caseId?: string }) => {
    const p = new URLSearchParams();
    if (params?.caseId) p.set('caseId', params.caseId);
    const q = p.toString();
    return q ? `${ApiPaths.recurringTaskTemplates}?${q}` : ApiPaths.recurringTaskTemplates;
  },
  recurringTaskTemplateDetail: (id: string) => `${ApiPaths.recurringTaskTemplates}/${id}`,
  recurringTaskTemplateCreate: () => ApiPaths.recurringTaskTemplates,
  recurringTaskTemplateUpdate: (id: string) => `${ApiPaths.recurringTaskTemplates}/${id}`,
  recurringTaskTemplateDelete: (id: string) => `${ApiPaths.recurringTaskTemplates}/${id}`,

  // Events (calendar + case/task)
  eventsList: (params?: { from?: string; to?: string; caseId?: string; taskId?: string }) => {
    const p = new URLSearchParams();
    if (params?.from) p.set('from', params.from);
    if (params?.to) p.set('to', params.to);
    if (params?.caseId) p.set('caseId', params.caseId);
    if (params?.taskId) p.set('taskId', params.taskId);
    const q = p.toString();
    return q ? `${ApiPaths.events}?${q}` : ApiPaths.events;
  },
  eventDetail: (id: string) => `${ApiPaths.events}/${id}`,
  eventCreate: () => ApiPaths.events,
  eventUpdate: (id: string) => `${ApiPaths.events}/${id}`,
  eventDelete: (id: string) => `${ApiPaths.events}/${id}`,

  // Reports (W6)
  reportsDashboard: () => `${ApiPaths.reports}/dashboard`,
  reportsExport: (type: string) => `${ApiPaths.reports}/export/${type}`,

  // Settings (W9)
  settingsPaymentGateway: () => `${ApiPaths.settings}/payment-gateway`,
  settingsEmailTemplates: () => `${ApiPaths.settings}/email-templates`,
  settingsNotificationRules: () => `${ApiPaths.settings}/notification-rules`,
  settingsCaseTypes: () => `${ApiPaths.settings}/case-types`,
  settingsFeatureToggles: () => `${ApiPaths.settings}/feature-toggles`,

  // Notification rules (W9)
  notificationRulesList: () => ApiPaths.notificationRules,
  notificationRuleDetail: (id: string) => `${ApiPaths.notificationRules}/${id}`,
  notificationRuleCreate: () => ApiPaths.notificationRules,

  // Approvals (Client Portal)
  approvalsList: () => ApiPaths.approvals,
  approvalCreate: () => ApiPaths.approvals,

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

  // Firms (enterprise)
  firmsList: () => ApiPaths.firms,
  firmDetail: (id: string) => `${ApiPaths.firms}/${id}`,
  firmConfigs: (firmId: string) => `${ApiPaths.firmConfigs}/${firmId}`,
  sessionsMe: () => `${ApiPaths.sessions}/me`,
  sessionRevoke: (id: string) => `${ApiPaths.sessions}/${id}`,
  exportList: () => ApiPaths.export,
  exportDetail: (id: string) => `${ApiPaths.export}/${id}`,
  exportRequest: () => ApiPaths.export,
} as const;
