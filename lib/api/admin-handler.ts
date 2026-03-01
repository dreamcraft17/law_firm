/**
 * Handler untuk /api/admin/* — dipakai panel admin-web.
 * Path: admin/users, admin/cases, admin/documents, dll.
 * R0.1: Auth + permission check; token/session memuat roleId + permissions.
 */
import bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, createSession, getPermissionsForUser, requirePermission, type AuthUser } from '@/lib/auth-helper';
import { generateAuditCertificatePdf } from '@/lib/audit-certificate-pdf';
import { runConflictCheck, saveConflictSnapshot } from '@/lib/conflict-check';
import { normalizeCaseForResponse, normalizeCaseListForResponse } from './case-response';
import { generateTotpSecret, verifyTotp, getTotpUri } from '@/lib/totp';
import { getNextNumber, formatCaseNumber, formatInvoiceNumber } from '@/lib/numbering';

const SALT_ROUNDS = 10;

/** SHA-256 hex of a string. */
function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

function omitPassword<T extends { passwordHash?: string | null }>(u: T): Omit<T, 'passwordHash'> {
  const { passwordHash: _, ...rest } = u;
  return rest;
}

function getRequiredPermission(group: string, method: string, rest: string[]): string | null {
  const id = rest[0];
  if (group === 'auth') return null;
  const map: Record<string, string> = {
    users: method === 'GET' ? 'users.view' : method === 'POST' ? 'users.create' : 'users.update',
    roles: method === 'GET' ? 'roles.view' : 'roles.manage',
    permissions: 'roles.view',
    clients: method === 'GET' ? 'cases.view' : method === 'POST' ? 'cases.create' : 'cases.update',
    leads: method === 'GET' ? 'cases.view' : method === 'POST' ? 'cases.create' : 'cases.update',
    cases: method === 'GET' ? 'cases.view' : method === 'POST' ? 'cases.create' : 'cases.update',
    search: 'cases.view',
    'saved-views': 'cases.view',
    'document-templates': method === 'GET' ? 'documents.view' : 'documents.create',
    documents: method === 'GET' ? 'documents.view' : 'documents.create',
    tasks: method === 'GET' ? 'tasks.view' : 'tasks.create',
    'time-entries': 'tasks.view',
    expenses: 'cases.view',
    'rate-cards': 'billing.view',
    billing: method === 'GET' ? 'billing.view' : 'billing.create',
    'rate-rules': 'billing.view',
    'recurring-task-templates': 'tasks.view',
    events: 'cases.view',
    reports: 'reports.view',
    settings: method === 'GET' ? 'settings.view' : 'settings.update',
    audit: 'audit.view',
    'knowledge-base': 'settings.view',
    'notification-rules': method === 'GET' ? 'settings.view' : 'settings.update',
    approvals: 'cases.view',
    firms: 'settings.update',
    'firm-configs': 'settings.view',
    sessions: 'users.view',
    export: 'audit.view',
    'sla-rules': method === 'GET' ? 'cases.view' : 'settings.update',
    escalations: method === 'GET' ? 'cases.view' : 'cases.update',
  };
  return map[group] ?? null;
}

export async function handleAdmin(
  pathSegments: string[],
  method: string,
  request: NextRequest
): Promise<NextResponse> {
  const [group, ...rest] = pathSegments;

  try {
    if (group === 'auth' && rest[0] === 'login' && method === 'POST') {
      return handleAdminAuthLogin(request);
    }

    const auth = await getAuthFromRequest(request, 'admin');
    if (auth && group === 'auth') {
      const authRes = await handleAuthTotp(rest, method, request, auth);
      if (authRes) return authRes;
    }
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const perm = getRequiredPermission(group, method, rest);
    if (perm) {
      try {
        requirePermission(auth, perm);
      } catch (res) {
        return res as NextResponse;
      }
    }

    switch (group) {
      case 'users':
        return handleUsers(rest, method, request);
      case 'roles':
        return handleRoles(rest, method, request);
      case 'permissions':
        return handlePermissions(rest, method, request);
      case 'clients':
        return handleClients(rest, method, request);
      case 'leads':
        return handleLeads(rest, method, request);
      case 'cases':
        return handleCases(rest, method, request);
      case 'search':
        return handleSearch(rest, method, request);
      case 'saved-views':
        return handleSavedViews(rest, method, request);
      case 'document-templates':
        return handleDocumentTemplates(rest, method, request);
      case 'documents':
        return handleDocuments(rest, method, request);
      case 'tasks':
        return handleTasks(rest, method, request);
      case 'time-entries':
        return handleTimeEntries(rest, method, request);
      case 'expenses':
        return handleExpenses(rest, method, request);
      case 'rate-cards':
        return handleRateCards(rest, method, request);
      case 'billing':
        return handleBilling(rest, method, request);
      case 'trust-accounts':
        return handleTrustAccounts(rest, method, request);
      case 'rate-rules':
        return handleRateRules(rest, method, request);
      case 'credit-notes':
        return handleCreditNotes(rest, method, request);
      case 'recurring-task-templates':
        return handleRecurringTaskTemplates(rest, method, request);
      case 'events':
        return handleEventsAdmin(rest, method, request);
      case 'reports':
        return handleReports(rest, method, request);
      case 'settings':
        return handleSettings(rest, method, request);
      case 'audit':
        return handleAudit(rest, method, request);
      case 'knowledge-base':
        return handleKnowledgeBase(rest, method, request);
      case 'notification-rules':
        return handleNotificationRules(rest, method, request);
      case 'approvals':
        return handleApprovalsAdmin(rest, method, request);
      case 'firms':
        return handleFirms(rest, method, request, auth);
      case 'firm-configs':
        return handleFirmConfigs(rest, method, request, auth);
      case 'sessions':
        return handleSessions(rest, method, request, auth);
      case 'export':
        return handleExport(rest, method, request, auth);
      case 'sla-rules':
        return handleSlaRules(rest, method, request);
      case 'escalations':
        return handleEscalations(rest, method, request, auth);
      default:
        return NextResponse.json(
          { error: 'Not found', path: pathSegments.join('/') },
          { status: 404 }
        );
    }
  } catch (e) {
    console.error('admin API error', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 }
    );
  }
}

async function handleUsers(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const id = rest[0];
  if (id) {
    if (method === 'GET') {
      const u = await prisma.user.findFirst({ where: { id, deletedAt: null } });
      return u ? NextResponse.json(omitPassword(u)) : NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (method === 'PUT' || method === 'PATCH') {
      let body: { name?: string; role?: string; roleId?: string | null; password?: string } = {};
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
      }
      const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
      if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const data: { name?: string; role?: string; roleId?: string | null; passwordHash?: string } = {};
      if (body.name !== undefined) data.name = body.name;
      if (body.role !== undefined) data.role = body.role;
      if (body.roleId !== undefined) data.roleId = body.roleId || null;
      if (body.password != null && body.password !== '') {
        data.passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);
      }
      const u = await prisma.user.update({ where: { id }, data });
      return NextResponse.json(omitPassword(u));
    }
    if (method === 'DELETE') {
      const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
      if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
      return NextResponse.json({ message: 'OK' });
    }
    if (rest[1] === 'login-history' && method === 'GET') {
      const logs = await prisma.auditLog.findMany({
        where: { userId: id, action: 'login' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return NextResponse.json({ data: logs });
    }
    if (rest[1] === 'force-logout' && method === 'POST') {
      const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
      if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      await prisma.auditLog.create({ data: { userId: id, action: 'force_logout', entity: 'user', entityId: id, details: { email: existing.email } } }).catch(() => {});
      return NextResponse.json({ message: 'OK' });
    }
    return methodNotAllowed();
  }
  if (method === 'GET') {
    const list = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return NextResponse.json({ data: list.map(omitPassword) });
  }
  if (method === 'POST') {
    let body: { email: string; name?: string; role?: string; roleId?: string | null; password: string } = { email: '', password: '' };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    if (!body.email?.trim()) return NextResponse.json({ error: 'email required' }, { status: 400 });
    if (!body.password) return NextResponse.json({ error: 'password required' }, { status: 400 });
    const existing = await prisma.user.findFirst({
      where: { email: body.email.trim().toLowerCase(), deletedAt: null },
    });
    if (existing) return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 });
    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);
    const u = await prisma.user.create({
      data: {
        email: body.email.trim().toLowerCase(),
        name: body.name?.trim() ?? null,
        role: body.role?.trim() ?? 'staff',
        roleId: body.roleId ?? null,
        passwordHash,
      },
    });
    return NextResponse.json(omitPassword(u), { status: 201 });
  }
  return methodNotAllowed();
}

function getDeviceFromRequest(request: NextRequest): { userAgent?: string; ipAddress?: string } {
  const userAgent = request.headers.get('user-agent') ?? undefined;
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? undefined;
  return { userAgent, ipAddress };
}

async function handleAdminAuthLogin(request: NextRequest): Promise<NextResponse> {
  let body: { email?: string; password?: string; totpCode?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const email = body.email?.trim()?.toLowerCase();
  const password = body.password;
  if (!email || !password) {
    return NextResponse.json({ error: 'email dan password wajib' }, { status: 400 });
  }
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    include: { roleRef: { include: { permissions: { include: { permission: true } } } } },
  });
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: 'Kredensial tidak valid' }, { status: 401 });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    await prisma.auditLog.create({ data: { userId: user.id, action: 'login_failed', entity: 'user', entityId: user.id, details: { email: user.email } } }).catch(() => {});
    return NextResponse.json({ error: 'Kredensial tidak valid' }, { status: 401 });
  }
  if (user.totpEnabled && user.totpSecret) {
    const code = body.totpCode?.trim();
    if (!code) return NextResponse.json({ error: 'TOTP required', totpRequired: true }, { status: 401 });
    if (!verifyTotp(user.totpSecret, code)) return NextResponse.json({ error: 'Kode TOTP tidak valid' }, { status: 401 });
  }
  await prisma.auditLog.create({ data: { userId: user.id, action: 'login', entity: 'user', entityId: user.id, details: { email: user.email } } }).catch(() => {});
  const device = getDeviceFromRequest(request);
  const token = await createSession(user.id, 'admin', undefined, device);
  const permissions = user.roleRef?.permissions?.map((rp) => rp.permission.key) ?? [];
  return NextResponse.json({
    access_token: token,
    user: omitPassword(user),
    roleId: user.roleId ?? null,
    permissions,
  });
}

async function handleAuthTotp(rest: string[], method: string, request: NextRequest, auth: AuthUser): Promise<NextResponse | null> {
  const sub = rest[0];
  if (sub === 'totp' && rest[1] === 'setup' && (method === 'GET' || method === 'POST')) {
    const secret = generateTotpSecret();
    await prisma.user.update({ where: { id: auth.userId }, data: { totpSecret: secret, totpEnabled: false } });
    const user = await prisma.user.findFirst({ where: { id: auth.userId } });
    const label = user?.email ?? auth.userId;
    return NextResponse.json({ secret, uri: getTotpUri(secret, label) });
  }
  if (sub === 'totp' && rest[1] === 'enable' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const code = (body.code as string)?.trim();
    if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });
    const user = await prisma.user.findFirst({ where: { id: auth.userId } });
    if (!user?.totpSecret) return NextResponse.json({ error: 'Run setup first' }, { status: 400 });
    if (!verifyTotp(user.totpSecret, code)) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    await prisma.user.update({ where: { id: auth.userId }, data: { totpEnabled: true } });
    return NextResponse.json({ message: 'TOTP enabled' });
  }
  if (sub === 'totp' && rest[1] === 'disable' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const password = body.password;
    if (!password) return NextResponse.json({ error: 'password required' }, { status: 400 });
    const user = await prisma.user.findFirst({ where: { id: auth.userId } });
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    await prisma.user.update({ where: { id: auth.userId }, data: { totpSecret: null, totpEnabled: false } });
    return NextResponse.json({ message: 'TOTP disabled' });
  }
  return null;
}

async function handlePermissions(rest: string[], method: string, _request: NextRequest): Promise<NextResponse> {
  if (method !== 'GET') return methodNotAllowed();
  const list = await prisma.permission.findMany({ orderBy: { key: 'asc' } });
  return NextResponse.json({ data: list });
}

async function handleRoles(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const id = rest[0];
  if (id && rest[1] === 'permissions' && (method === 'PUT' || method === 'PATCH')) {
    const roleId = id;
    let body: { permissionIds?: string[] } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    const permissionIds = Array.isArray(body.permissionIds) ? body.permissionIds : [];
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
        skipDuplicates: true,
      });
    }
    const updated = await prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: { include: { permission: true } } },
    });
    return NextResponse.json(updated);
  }
  if (id) {
    if (method === 'GET') {
      const role = await prisma.role.findUnique({
        where: { id },
        include: { permissions: { include: { permission: true } } },
      });
      return role ? NextResponse.json(role) : NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (method === 'PUT' || method === 'PATCH') {
      const body = await request.json().catch(() => ({}));
      const name = (body.name as string)?.trim();
      if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
      const existing = await prisma.role.findFirst({ where: { id } });
      if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const updated = await prisma.role.update({ where: { id }, data: { name } });
      return NextResponse.json(updated);
    }
    if (method === 'DELETE') {
      const existing = await prisma.role.findUnique({ where: { id } });
      if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      await prisma.role.delete({ where: { id } });
      return NextResponse.json({ message: 'OK' });
    }
    return methodNotAllowed();
  }
  if (method === 'GET') {
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { permissions: true, users: true } } },
    });
    return NextResponse.json({ data: roles });
  }
  if (method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const name = (body.name as string)?.trim();
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
    const created = await prisma.role.create({ data: { name } });
    return NextResponse.json(created, { status: 201 });
  }
  return methodNotAllowed();
}

// --- M1: Client Management ---
async function handleClients(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  if (rest[0] === 'check-duplicates' && method === 'GET') {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name')?.trim();
    const email = searchParams.get('email')?.trim();
    const npwp = searchParams.get('npwp')?.trim();
    const where: Prisma.ClientWhereInput = { deletedAt: null };
    const or: Prisma.ClientWhereInput[] = [];
    if (name && name.length >= 2) or.push({ name: { contains: name, mode: 'insensitive' } });
    if (email && email.length >= 3) or.push({ contacts: { some: { email: { contains: email, mode: 'insensitive' } } } });
    if (npwp && npwp.length >= 6) or.push({ npwp: { contains: npwp, mode: 'insensitive' } });
    if (or.length === 0) return NextResponse.json({ data: [] });
    const list = await prisma.client.findMany({
      where: { ...where, OR: or },
      take: 20,
      select: { id: true, name: true, npwp: true, contacts: { select: { email: true } } },
    });
    return NextResponse.json({ data: list });
  }
  const id = rest[0];
  if (id && id !== 'contacts') {
    if (rest[1] === 'contacts') {
      const clientId = id;
      if (method === 'GET') {
        const list = await prisma.clientContact.findMany({
          where: { clientId, deletedAt: null },
          orderBy: { isPrimary: 'desc' },
        });
        return NextResponse.json({ data: list });
      }
      if (method === 'POST') {
        try {
          const body = await request.json().catch(() => ({}));
          const c = await prisma.clientContact.create({
            data: {
              clientId,
              name: body.name ?? '',
              email: body.email ?? null,
              phone: body.phone ?? null,
              role: body.role ?? null,
              isPrimary: !!body.isPrimary,
            },
          });
          return NextResponse.json(c, { status: 201 });
        } catch (e) {
          return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
        }
      }
      return methodNotAllowed();
    }
    if (method === 'GET') {
      const c = await prisma.client.findFirst({
        where: { id, deletedAt: null },
        include: { contacts: { where: { deletedAt: null } } },
      });
      return c ? NextResponse.json(c) : NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (method === 'PUT' || method === 'PATCH') {
      try {
        const body = await request.json().catch(() => ({}));
        const data: { name?: string; type?: string; billingAddress?: string | null; npwp?: string | null; status?: string; internalNotes?: string | null } = {};
        if (body.name !== undefined) data.name = body.name;
        if (body.type !== undefined) data.type = body.type;
        if (body.billingAddress !== undefined) data.billingAddress = body.billingAddress;
        if (body.npwp !== undefined) data.npwp = body.npwp;
        if (body.status !== undefined) data.status = body.status;
        if (body.internalNotes !== undefined) data.internalNotes = body.internalNotes;
        const c = await prisma.client.update({ where: { id }, data });
        return NextResponse.json(c);
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
      }
    }
    if (method === 'DELETE') {
      const c = await prisma.client.findFirst({ where: { id, deletedAt: null } });
      if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      await prisma.client.update({ where: { id }, data: { deletedAt: new Date() } });
      return NextResponse.json({ message: 'OK' });
    }
    return methodNotAllowed();
  }
  if (method === 'GET') {
    const list = await prisma.client.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      take: 500,
      include: { _count: { select: { cases: true } } },
    });
    return NextResponse.json({ data: list });
  }
  if (method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 });
      const c = await prisma.client.create({
        data: {
          name: body.name,
          type: body.type ?? 'individual',
          billingAddress: body.billingAddress ?? null,
          npwp: body.npwp ?? null,
          status: body.status ?? 'active',
          internalNotes: body.internalNotes ?? null,
        },
      });
      return NextResponse.json(c, { status: 201 });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }
  return methodNotAllowed();
}

// --- M4: Intake & Lead Management ---
const DEFAULT_CHECKLIST_KEYS = ['initial_doc', 'kyc', 'retainer'];
const DEFAULT_INITIAL_TASKS = ['Review dokumen intake', 'Jadwalkan konsultasi', 'Konfirmasi engagement'];

async function handleLeads(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const id = rest[0];
  if (id && id !== 'conflict-check') {
    if (rest[1] === 'convert' && method === 'POST') {
      const lead = await prisma.lead.findFirst({ where: { id, deletedAt: null }, include: { client: true, case: true } });
      if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      if (lead.caseId) return NextResponse.json({ error: 'Lead already converted to case' }, { status: 400 });
      try {
        const body = await request.json().catch(() => ({}));
        const parties = (body.parties as Record<string, string>) ?? {};
        let clientId = lead.clientId;
        if (!clientId) {
          const client = await prisma.client.create({
            data: {
              name: lead.name,
              type: 'individual',
              status: 'active',
            },
          });
          clientId = client.id;
        }
        const caseTitle = body.title?.trim() || `${lead.serviceCategory || 'Matter'} - ${lead.name}`;
        const newCase = await prisma.case.create({
          data: {
            title: caseTitle,
            status: 'open',
            stage: 'intake',
            clientId,
            description: lead.problemSummary ?? null,
            parties: Object.keys(parties).length ? (parties as Prisma.InputJsonValue) : Prisma.JsonNull,
          },
          include: { client: true },
        });
        const authLead = await getAuthFromRequest(request, 'admin').catch(() => null);
        const { hasConflict, conflicts } = await runConflictCheck({
          clientId,
          excludeCaseId: newCase.id,
          parties: Object.keys(parties).length ? parties : null,
          partyNames: [],
          client_name: lead.name ?? undefined,
        });
        await saveConflictSnapshot({ caseId: newCase.id, hasConflict, conflicts, checkedById: authLead?.userId ?? null });
        const taskTitles = Array.isArray(body.initialTaskTitles) ? body.initialTaskTitles : DEFAULT_INITIAL_TASKS;
        for (const title of taskTitles) {
          await prisma.task.create({
            data: { title, status: 'pending', caseId: newCase.id },
          });
        }
        await prisma.lead.update({
          where: { id },
          data: { clientId, caseId: newCase.id, status: 'converted' },
        });
        const checklist = await prisma.leadIntakeChecklist.findMany({ where: { leadId: id } });
        for (const key of DEFAULT_CHECKLIST_KEYS) {
          if (!checklist.some((c) => c.itemKey === key)) {
            await prisma.leadIntakeChecklist.create({
              data: { leadId: id, caseId: newCase.id, itemKey: key, status: 'pending' },
            });
          }
        }
        await prisma.auditLog.create({
          data: { action: 'lead_convert', entity: 'lead', entityId: id, details: { caseId: newCase.id, clientId } },
        }).catch(() => {});
        return NextResponse.json({
          lead: await prisma.lead.findFirst({ where: { id }, include: { client: true, case: true } }),
          case: normalizeCaseForResponse(newCase as Parameters<typeof normalizeCaseForResponse>[0]),
        }, { status: 201 });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Convert failed' }, { status: 400 });
      }
    }
    if (rest[1] === 'checklist') {
      const leadId = id;
      const lead = await prisma.lead.findFirst({ where: { id: leadId, deletedAt: null } });
      if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      if (method === 'GET') {
        const list = await prisma.leadIntakeChecklist.findMany({ where: { leadId }, orderBy: { itemKey: 'asc' } });
        return NextResponse.json({ data: list });
      }
      if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        const body = await request.json().catch(() => ({}));
        const itemKey = (body.itemKey ?? body.item_key) as string;
        const status = (body.status as string) ?? 'pending';
        const notes = body.notes ?? null;
        if (!itemKey) return NextResponse.json({ error: 'itemKey required' }, { status: 400 });
        const existing = await prisma.leadIntakeChecklist.findFirst({ where: { leadId, itemKey } });
        let item;
        if (existing) {
          item = await prisma.leadIntakeChecklist.update({
            where: { id: existing.id },
            data: { status, notes },
          });
        } else {
          item = await prisma.leadIntakeChecklist.create({
            data: { leadId, itemKey, status, notes },
          });
        }
        return NextResponse.json(item, { status: 201 });
      }
      return methodNotAllowed();
    }
    if (rest[1] === 'consultation' && method === 'POST') {
      const leadId = id;
      const lead = await prisma.lead.findFirst({ where: { id: leadId, deletedAt: null }, include: { events: { where: { deletedAt: null }, orderBy: { startAt: 'desc' }, take: 1 } } });
      if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      try {
        const body = await request.json().catch(() => ({}));
        const action = (body.action as string) || 'request'; // request | confirm | reschedule
        const startAt = body.startAt ?? body.start_at;
        const endAt = body.endAt ?? body.end_at;
        const title = body.title?.trim() || `Konsultasi: ${lead.name}`;
        const existingEvent = lead.events[0];
        if (action === 'confirm' && existingEvent) {
          const updated = await prisma.event.update({
            where: { id: existingEvent.id },
            data: { title, startAt: startAt ? new Date(startAt) : undefined, endAt: endAt ? new Date(endAt) : undefined },
          });
          return NextResponse.json(updated);
        }
        if (action === 'reschedule' && existingEvent) {
          if (!startAt) return NextResponse.json({ error: 'startAt required for reschedule' }, { status: 400 });
          const updated = await prisma.event.update({
            where: { id: existingEvent.id },
            data: { title, startAt: new Date(startAt), endAt: endAt ? new Date(endAt) : new Date(new Date(startAt).getTime() + 3600000) },
          });
          return NextResponse.json(updated);
        }
        if (!startAt) return NextResponse.json({ error: 'startAt required' }, { status: 400 });
        const event = await prisma.event.create({
          data: {
            title,
            type: 'consultation',
            leadId,
            startAt: new Date(startAt),
            endAt: endAt ? new Date(endAt) : new Date(new Date(startAt).getTime() + 3600000),
          },
        });
        return NextResponse.json(event, { status: 201 });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Consultation failed' }, { status: 400 });
      }
    }
    if (method === 'GET') {
      const lead = await prisma.lead.findFirst({
        where: { id, deletedAt: null },
        include: { client: true, case: true, documents: true, checklist: true, events: { where: { deletedAt: null } } },
      });
      return lead ? NextResponse.json(lead) : NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (method === 'PUT' || method === 'PATCH') {
      const body = await request.json().catch(() => ({}));
      const existing = await prisma.lead.findFirst({ where: { id, deletedAt: null } });
      if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const data: {
        name?: string; email?: string | null; phone?: string | null; source?: string | null;
        serviceCategory?: string | null; problemSummary?: string | null; status?: string;
      } = {};
      if (body.name !== undefined) data.name = body.name?.trim() ?? existing.name;
      if (body.email !== undefined) data.email = body.email?.trim() || null;
      if (body.phone !== undefined) data.phone = body.phone?.trim() || null;
      if (body.source !== undefined) data.source = body.source?.trim() || null;
      if (body.serviceCategory !== undefined || body.service_category !== undefined) data.serviceCategory = (body.serviceCategory ?? body.service_category)?.trim() || null;
      if (body.problemSummary !== undefined || body.problem_summary !== undefined) data.problemSummary = (body.problemSummary ?? body.problem_summary)?.trim() || null;
      if (body.status !== undefined) data.status = body.status;
      const updated = await prisma.lead.update({
        where: { id },
        data,
        include: { client: true, case: true, documents: true, checklist: true },
      });
      return NextResponse.json(updated);
    }
    if (method === 'DELETE') {
      const existing = await prisma.lead.findFirst({ where: { id, deletedAt: null } });
      if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      await prisma.lead.update({ where: { id }, data: { deletedAt: new Date() } });
      return NextResponse.json({ message: 'OK' });
    }
    return methodNotAllowed();
  }
  if (rest[0] === 'conflict-check' && method === 'POST') {
    return handleCases(['conflict-check'], 'POST', request);
  }
  if (method === 'GET') {
    const q = request.nextUrl.searchParams;
    const source = q.get('source') ?? undefined;
    const status = q.get('status') ?? undefined;
    const list = await prisma.lead.findMany({
      where: {
        deletedAt: null,
        ...(source && { source }),
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { client: { select: { id: true, name: true } }, case: { select: { id: true, title: true } } },
    });
    return NextResponse.json({ data: list });
  }
  if (method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      if (!body.name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
      const lead = await prisma.lead.create({
        data: {
          name: body.name.trim(),
          email: body.email?.trim() || null,
          phone: body.phone?.trim() || null,
          source: body.source?.trim() || null,
          serviceCategory: (body.serviceCategory ?? body.service_category)?.trim() || null,
          problemSummary: (body.problemSummary ?? body.problem_summary)?.trim() || null,
          status: body.status ?? 'new',
        },
        include: { client: true, case: true },
      });
      return NextResponse.json(lead, { status: 201 });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }
  return methodNotAllowed();
}

/** Resolve clientId dari client_name atau clientId (find or create di master Client). */
async function resolveClientId(body: { clientId?: string | null; client_name?: string }): Promise<string | null> {
  if (body.clientId) return body.clientId;
  const name = body.client_name?.trim();
  if (!name) return null;
  let client = await prisma.client.findFirst({ where: { name, deletedAt: null } });
  if (!client) {
    client = await prisma.client.create({
      data: { name, type: 'individual', status: 'active' },
    });
  }
  return client.id;
}

async function handleSearch(_rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  if (method !== 'GET') return methodNotAllowed();
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const typesParam = searchParams.get('types');
  const types = typesParam ? typesParam.split(',').map((t) => t.trim()).filter(Boolean) : ['case', 'client', 'document', 'task'];
  const take = Math.min(Number(searchParams.get('limit')) || 20, 50);

  const results: { cases: unknown[]; clients: unknown[]; documents: unknown[]; tasks: unknown[] } = {
    cases: [],
    clients: [],
    documents: [],
    tasks: [],
  };

  if (!q) return NextResponse.json({ data: results });

  if (types.includes('case')) {
    const cases = await prisma.case.findMany({
      where: {
        deletedAt: null,
        OR: [
          { caseNumber: { contains: q, mode: 'insensitive' } },
          { title: { contains: q, mode: 'insensitive' } },
          { client: { name: { contains: q, mode: 'insensitive' } } },
        ],
      },
      take,
      orderBy: { updatedAt: 'desc' },
      include: { client: { select: { id: true, name: true } } },
    });
    results.cases = cases.map((c) => ({ ...normalizeCaseForResponse(c), client: c.client }));
  }
  if (types.includes('client')) {
    const clients = await prisma.client.findMany({
      where: { deletedAt: null, name: { contains: q, mode: 'insensitive' } },
      take,
      orderBy: { name: 'asc' },
    });
    results.clients = clients;
  }
  if (types.includes('document')) {
    const documents = await prisma.document.findMany({
      where: { deletedAt: null, name: { contains: q, mode: 'insensitive' } },
      take,
      orderBy: { updatedAt: 'desc' },
      include: { case: { select: { id: true, title: true, caseNumber: true } } },
    });
    results.documents = documents;
  }
  if (types.includes('task')) {
    const tasks = await prisma.task.findMany({
      where: {
        deletedAt: null,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      take,
      orderBy: { updatedAt: 'desc' },
      include: { case: { select: { id: true, title: true } } },
    });
    results.tasks = tasks;
  }

  return NextResponse.json({ data: results });
}

async function handleSavedViews(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const auth = await getAuthFromRequest(request, 'admin');
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = auth.userId;
  const id = rest[0];

  if (id && method === 'GET') {
    const v = await prisma.savedView.findFirst({ where: { id, userId } });
    return v ? NextResponse.json(v) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (id && (method === 'PUT' || method === 'PATCH')) {
    try {
      const body = await request.json().catch(() => ({}));
      const v = await prisma.savedView.findFirst({ where: { id, userId } });
      if (!v) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const updated = await prisma.savedView.update({
        where: { id },
        data: {
          name: body.name ?? v.name,
          entityType: body.entityType ?? v.entityType,
          filters: body.filters !== undefined ? (body.filters as object) : v.filters as object,
          sortOrder: body.sortOrder ?? v.sortOrder,
        },
      });
      return NextResponse.json(updated);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }
  if (id && method === 'DELETE') {
    const v = await prisma.savedView.findFirst({ where: { id, userId } });
    if (!v) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await prisma.savedView.delete({ where: { id } });
    return NextResponse.json({ message: 'OK' });
  }
  if (method === 'GET') {
    const list = await prisma.savedView.findMany({ where: { userId }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] });
    return NextResponse.json({ data: list });
  }
  if (method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      if (!body.name || !body.entityType) return NextResponse.json({ error: 'name and entityType required' }, { status: 400 });
      const v = await prisma.savedView.create({
        data: {
          userId,
          name: String(body.name),
          entityType: String(body.entityType),
          filters: (body.filters && typeof body.filters === 'object') ? body.filters : {},
          sortOrder: Number(body.sortOrder) || 0,
        },
      });
      return NextResponse.json(v, { status: 201 });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }
  return methodNotAllowed();
}

async function handleDocumentTemplates(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const id = rest[0];
  if (id && method === 'GET') {
    const t = await prisma.documentTemplate.findFirst({ where: { id, deletedAt: null } });
    return t ? NextResponse.json(t) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (id && (method === 'PUT' || method === 'PATCH')) {
    try {
      const body = await request.json().catch(() => ({}));
      const t = await prisma.documentTemplate.findFirst({ where: { id, deletedAt: null } });
      if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const updated = await prisma.documentTemplate.update({
        where: { id },
        data: {
          name: body.name ?? t.name,
          templateKey: body.templateKey ?? t.templateKey,
          fileUrl: body.fileUrl ?? t.fileUrl,
          mergeFields: body.mergeFields !== undefined ? body.mergeFields : t.mergeFields,
          category: body.category ?? t.category,
        },
      });
      return NextResponse.json(updated);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }
  if (id && method === 'DELETE') {
    const t = await prisma.documentTemplate.findFirst({ where: { id, deletedAt: null } });
    if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await prisma.documentTemplate.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ message: 'OK' });
  }
  if (method === 'GET') {
    const list = await prisma.documentTemplate.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } });
    return NextResponse.json({ data: list });
  }
  if (method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 });
      const t = await prisma.documentTemplate.create({
        data: {
          name: String(body.name),
          templateKey: body.templateKey ?? null,
          fileUrl: body.fileUrl ?? null,
          mergeFields: body.mergeFields ?? Prisma.JsonNull,
          category: body.category ?? null,
        },
      });
      return NextResponse.json(t, { status: 201 });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }
  return methodNotAllowed();
}

async function handleCases(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  // Conflict check: must run before treating first segment as case id
  if (rest[0] === 'conflict-check' && method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      const partyNames: string[] = Array.isArray(body.partyNames)
        ? body.partyNames.filter((n: unknown) => typeof n === 'string' && n.trim()).map((n: string) => n.trim())
        : [];
      const { hasConflict, conflicts } = await runConflictCheck({
        clientId: body.clientId ?? null,
        excludeCaseId: body.caseId ?? body.excludeCaseId ?? null,
        parties: (body.parties as Record<string, string>) ?? null,
        partyNames,
        client_name: body.client_name,
      });
      const authLog = await getAuthFromRequest(request, 'admin').catch(() => null);
      await prisma.conflictCheckLog.create({
        data: {
          firmId: authLog?.firmId ?? null,
          checkedBy: authLog?.userId ?? null,
          inputNames: partyNames as Prisma.InputJsonValue,
          conflicts: conflicts as unknown as Prisma.InputJsonValue,
          hasConflict,
        },
      }).catch(() => {});
      return NextResponse.json({ hasConflict, conflicts });
    } catch {
      return NextResponse.json({ hasConflict: false, conflicts: [] });
    }
  }

  const id = rest[0];
  if (id) {
    if (rest[1] === 'conflict-override' && method === 'POST') {
      const auth = await getAuthFromRequest(request, 'admin');
      if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const caseExists = await prisma.case.findFirst({ where: { id, deletedAt: null } });
      if (!caseExists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const body = await request.json().catch(() => ({}));
      const note = (body.note as string)?.trim();
      if (!note) return NextResponse.json({ error: 'Alasan override wajib diisi (compliance)' }, { status: 400 });
      await prisma.caseConflictOverride.upsert({
        where: { caseId: id },
        create: { caseId: id, approvedById: auth.userId, note },
        update: { approvedById: auth.userId, note },
      });
      const c = await prisma.case.findFirst({
        where: { id },
        include: { client: true, conflictOverride: { include: { approvedBy: { select: { id: true, name: true } } } } },
      });
      if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(normalizeCaseForResponse(c));
    }
    if (method === 'GET') {
      const c = await prisma.case.findFirst({
        where: { id, deletedAt: null },
        include: {
          client: true,
          conflictOverride: { include: { approvedBy: { select: { id: true, name: true } } } },
          conflictSnapshot: true,
        },
      });
      if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const out = normalizeCaseForResponse(c);
      (out as { conflictOverride?: unknown }).conflictOverride = c.conflictOverride;
      (out as { conflictSnapshot?: unknown }).conflictSnapshot = c.conflictSnapshot;
      return NextResponse.json(out);
    }
    if (method === 'PUT' || method === 'PATCH') {
      let body: { title?: string; status?: string; stage?: string; caseType?: string | null; case_type?: string; clientId?: string | null; client_name?: string; caseNumber?: string; case_number?: string; description?: string | null; parties?: unknown; slaPaused?: boolean; sla_pause?: boolean; slaPausedReason?: string | null; sla_paused_reason?: string | null } = {};
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
      }
      const existing = await prisma.case.findFirst({ where: { id, deletedAt: null } });
      if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const data: { title?: string; status?: string; stage?: string; caseType?: string | null; clientId?: string | null; caseNumber?: string | null; description?: string | null; parties?: unknown; slaPaused?: boolean; slaPausedReason?: string | null } = {};
      if (body.title !== undefined) data.title = body.title.trim();
      if (body.status !== undefined) data.status = body.status;
      if (body.stage !== undefined) data.stage = body.stage;
      if (body.caseType !== undefined || body.case_type !== undefined) data.caseType = (body.caseType ?? body.case_type)?.trim() || null;
      if (body.clientId !== undefined || body.client_name !== undefined) data.clientId = await resolveClientId(body);
      if (body.caseNumber !== undefined || body.case_number !== undefined) data.caseNumber = (body.caseNumber ?? body.case_number)?.trim() || null;
      if (body.description !== undefined) data.description = body.description?.trim() || null;
      if (body.parties !== undefined) data.parties = body.parties;
      if (body.slaPaused !== undefined || body.sla_pause !== undefined) data.slaPaused = Boolean(body.slaPaused ?? body.sla_pause);
      if (body.slaPausedReason !== undefined || body.sla_paused_reason !== undefined) data.slaPausedReason = (body.slaPausedReason ?? body.sla_paused_reason)?.trim() || null;
      const updateData: Prisma.CaseUpdateInput = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.stage !== undefined) {
        updateData.stage = data.stage;
        updateData.stageChangedAt = new Date();
      }
      if (data.caseType !== undefined) updateData.caseType = data.caseType;
      if (data.clientId === null) updateData.client = { disconnect: true };
      else if (data.clientId !== undefined) updateData.client = { connect: { id: data.clientId } };
      if (data.caseNumber !== undefined) updateData.caseNumber = data.caseNumber;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.parties !== undefined) updateData.parties = data.parties as Prisma.InputJsonValue;
      if (data.slaPaused === true) {
        updateData.slaPausedAt = new Date();
        updateData.slaPausedReason = data.slaPausedReason ?? 'Paused (e.g. waiting for client)';
      } else if (data.slaPaused === false) {
        updateData.slaPausedAt = null;
        updateData.slaPausedReason = null;
      }
      if (data.caseType !== undefined && data.caseType) {
        const sla = await getSlaDueFromRule(existing.firmId, data.caseType, existing.createdAt, existing.stageChangedAt, existing.stage);
        if (sla) updateData.slaDueDate = sla.slaDueDate;
        else if (data.caseType === null) updateData.slaDueDate = null;
      }
      const c = await prisma.case.update({
        where: { id },
        data: updateData,
        include: { client: true },
      });
      await prisma.auditLog.create({ data: { action: 'update', entity: 'case', entityId: id, details: { title: c.title } } }).catch(() => {});
      return NextResponse.json(normalizeCaseForResponse(c));
    }
    if (method === 'DELETE') {
      const existing = await prisma.case.findFirst({ where: { id, deletedAt: null } });
      if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      await prisma.case.update({ where: { id }, data: { deletedAt: new Date() } });
      await prisma.auditLog.create({ data: { action: 'delete', entity: 'case', entityId: id, details: { title: existing.title } } }).catch(() => {});
      return NextResponse.json({ message: 'OK' });
    }
    if (rest[1] === 'team') {
      const caseExists = await prisma.case.findFirst({ where: { id, deletedAt: null } });
      if (!caseExists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (method === 'GET') {
        const members = await prisma.caseTeamMember.findMany({
          where: { caseId: id },
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
        });
        return NextResponse.json({ data: members });
      }
      if (method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const userId = body.userId ?? body.user_id;
        const role = body.role ?? 'member';
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
        const member = await prisma.caseTeamMember.upsert({
          where: { caseId_userId: { caseId: id, userId } },
          create: { caseId: id, userId, role },
          update: { role },
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
        });
        return NextResponse.json(member, { status: 201 });
      }
      if (method === 'DELETE') {
        const body = await request.json().catch(() => ({}));
        const userId = body.userId ?? body.user_id ?? rest[2];
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
        await prisma.caseTeamMember.deleteMany({ where: { caseId: id, userId } });
        return NextResponse.json({ message: 'OK' });
      }
      return methodNotAllowed();
    }
    if (rest[1] === 'milestones' && method === 'GET') {
      const caseExists = await prisma.case.findFirst({ where: { id, deletedAt: null } });
      if (!caseExists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const list = await prisma.caseMilestone.findMany({ where: { caseId: id }, orderBy: [{ sortOrder: 'asc' }, { dueDate: 'asc' }] });
      return NextResponse.json({ data: list });
    }
    if (rest[1] === 'milestones' && method === 'POST') {
      try {
        const body = await request.json().catch(() => ({}));
        const caseExists = await prisma.case.findFirst({ where: { id, deletedAt: null } });
        if (!caseExists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        const m = await prisma.caseMilestone.create({
          data: {
            caseId: id,
            name: body.name ?? 'Milestone',
            dueDate: body.dueDate ? new Date(body.dueDate) : null,
            completedAt: body.completedAt ? new Date(body.completedAt) : null,
            sortOrder: Number(body.sortOrder) ?? 0,
          },
        });
        return NextResponse.json(m, { status: 201 });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
      }
    }
    if (rest[1] === 'milestones' && rest[2] && (method === 'PUT' || method === 'PATCH')) {
      try {
        const mid = rest[2];
        const body = await request.json().catch(() => ({}));
        const m = await prisma.caseMilestone.findFirst({ where: { id: mid, caseId: id } });
        if (!m) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        const updated = await prisma.caseMilestone.update({
          where: { id: mid },
          data: {
            name: body.name ?? m.name,
            dueDate: body.dueDate !== undefined ? (body.dueDate ? new Date(body.dueDate) : null) : m.dueDate,
            completedAt: body.completedAt !== undefined ? (body.completedAt ? new Date(body.completedAt) : null) : m.completedAt,
            sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : m.sortOrder,
          },
        });
        return NextResponse.json(updated);
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
      }
    }
    if (rest[1] === 'milestones' && rest[2] && method === 'DELETE') {
      const mid = rest[2];
      const m = await prisma.caseMilestone.findFirst({ where: { id: mid, caseId: id } });
      if (!m) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      await prisma.caseMilestone.delete({ where: { id: mid } });
      return NextResponse.json({ message: 'OK' });
    }
    if (rest[1] === 'access') {
      const auth = await getAuthFromRequest(request, 'admin');
      if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const caseExists = await prisma.case.findFirst({ where: { id, deletedAt: null } });
      if (!caseExists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (method === 'GET') {
        const list = await prisma.caseAccess.findMany({ where: { caseId: id }, include: { user: { select: { id: true, email: true, name: true } } } });
        return NextResponse.json({ data: list });
      }
      if (method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const userId = body.userId ?? body.user_id;
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
        const row = await prisma.caseAccess.upsert({
          where: { caseId_userId: { caseId: id, userId } },
          create: {
            caseId: id,
            userId,
            canView: body.canView !== false,
            canEdit: body.canEdit === true,
            canBilling: body.canBilling === true,
            canDocuments: body.canDocuments === true,
          },
          update: {
            canView: body.canView !== false,
            canEdit: body.canEdit === true,
            canBilling: body.canBilling === true,
            canDocuments: body.canDocuments === true,
          },
          include: { user: { select: { id: true, email: true, name: true } } },
        });
        return NextResponse.json(row, { status: 201 });
      }
      if (rest[2] && method === 'DELETE') {
        const userId = rest[2];
        await prisma.caseAccess.deleteMany({ where: { caseId: id, userId } });
        return NextResponse.json({ message: 'OK' });
      }
      return methodNotAllowed();
    }
    if (rest[1] === 'export' && method === 'GET') {
      const c = await prisma.case.findFirst({
        where: { id, deletedAt: null },
        include: { client: true },
      });
      if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const accept = request.headers.get('accept') ?? '';
      if (accept.includes('text/csv')) {
        const rows = [
          ['id', 'title', 'case_number', 'status', 'client_name', 'description', 'created_at'].join(','),
          [c.id, `"${(c.title ?? '').replace(/"/g, '""')}"`, c.caseNumber ?? '', c.status, `"${(c.client?.name ?? '').replace(/"/g, '""')}"`, `"${(c.description ?? '').replace(/"/g, '""')}"`, c.createdAt.toISOString()].join(','),
        ];
        return new NextResponse(rows.join('\n'), {
          headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="case-${id}.csv"` },
        });
      }
      return NextResponse.json(normalizeCaseForResponse(c));
    }
    return methodNotAllowed();
  }
  if (method === 'GET') {
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get('stage');
    const clientId = searchParams.get('clientId');
    const assigneeId = searchParams.get('assigneeId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const where: Prisma.CaseWhereInput = { deletedAt: null };
    if (stage) where.stage = stage;
    if (clientId) where.clientId = clientId;
    if (assigneeId) {
      where.teamMembers = { some: { userId: assigneeId } };
    }
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(from);
      if (to) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(to);
    }
    const list = await prisma.case.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { client: true },
    });
    return NextResponse.json({ data: normalizeCaseListForResponse(list) });
  }
  if (method === 'POST') {
    let body: {
      title: string;
      status?: string;
      stage?: string;
      caseType?: string | null;
      case_type?: string;
      clientId?: string | null;
      client_name?: string;
      caseNumber?: string;
      case_number?: string;
      description?: string | null;
      parties?: unknown;
      partyNames?: string[];
    } = { title: '' };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    if (!body.title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 });
    const clientId = await resolveClientId(body);
    const auth = await getAuthFromRequest(request, 'admin');
    const firmId = auth?.firmId ?? null;
    const caseType = (body.caseType ?? body.case_type)?.trim() || null;
    let caseNumber = (body.caseNumber ?? body.case_number)?.trim() || null;
    if (!caseNumber && firmId) {
      try {
        const year = new Date().getFullYear();
        const seq = await getNextNumber(firmId, 'case', String(year));
        const prefix = (await prisma.firmConfig.findUnique({ where: { firmId_key: { firmId, key: 'case_number_prefix' } } }))?.value as string | null;
        caseNumber = formatCaseNumber(prefix ?? null, year, seq);
      } catch {
        // leave caseNumber null if sequence fails
      }
    }
    const c = await prisma.case.create({
      data: {
        firmId,
        title: body.title.trim(),
        status: body.status?.trim() ?? 'open',
        stage: body.stage?.trim() ?? 'intake',
        caseType,
        clientId,
        caseNumber,
        description: body.description?.trim() || null,
        parties: body.parties != null ? (body.parties as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
      include: { client: true },
    });
    const { hasConflict, conflicts } = await runConflictCheck({
      clientId: clientId ?? null,
      excludeCaseId: c.id,
      parties: (body.parties as Record<string, string>) ?? null,
      partyNames: Array.isArray(body.partyNames) ? (body.partyNames as string[]).filter(Boolean) : [],
      client_name: body.client_name,
    });
    await saveConflictSnapshot({ caseId: c.id, hasConflict, conflicts, checkedById: auth?.userId ?? null });
    if (caseType) {
      const sla = await getSlaDueFromRule(firmId, caseType, c.createdAt);
      if (sla) await prisma.case.update({ where: { id: c.id }, data: { slaDueDate: sla.slaDueDate } });
    }
    await prisma.auditLog.create({ data: { action: 'create', entity: 'case', entityId: c.id, details: { title: c.title } } }).catch(() => {});
    const out = await prisma.case.findFirst({ where: { id: c.id }, include: { client: true } });
    return NextResponse.json(normalizeCaseForResponse(out ?? c), { status: 201 });
  }
  return methodNotAllowed();
}

async function handleTasks(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  if (rest[0] === 'case' && rest[1] && method === 'GET') {
    const list = await prisma.task.findMany({
      where: { caseId: rest[1], deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return NextResponse.json({ data: list });
  }
  const id = rest[0];
  if (id) {
    if (rest[1] === 'dependencies' && method === 'GET') {
      const deps = await prisma.taskDependency.findMany({
        where: { taskId: id },
        include: { dependsOnTask: { select: { id: true, title: true, status: true, dueDate: true } } },
      });
      return NextResponse.json({ data: deps });
    }
    if (rest[1] === 'dependencies' && method === 'POST') {
      try {
        const body = await request.json().catch(() => ({}));
        const dependsOnTaskId = body.dependsOnTaskId ?? body.depends_on_task_id;
        if (!dependsOnTaskId) return NextResponse.json({ error: 'dependsOnTaskId required' }, { status: 400 });
        if (dependsOnTaskId === id) return NextResponse.json({ error: 'Task cannot depend on itself' }, { status: 400 });
        const dep = await prisma.taskDependency.create({
          data: { taskId: id, dependsOnTaskId },
          include: { dependsOnTask: { select: { id: true, title: true, status: true } } },
        });
        return NextResponse.json(dep, { status: 201 });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
      }
    }
    if (rest[1] === 'dependencies' && rest[2] && method === 'DELETE') {
      const depId = rest[2];
      await prisma.taskDependency.deleteMany({ where: { id: depId, taskId: id } });
      return NextResponse.json({ message: 'OK' });
    }
    if (method === 'GET') {
      const t = await prisma.task.findFirst({
        where: { id, deletedAt: null },
        include: { dependsOn: { include: { dependsOnTask: { select: { id: true, title: true, status: true } } } }, case: { select: { id: true, title: true } } },
      });
      return t ? NextResponse.json(t) : NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (method === 'PUT' || method === 'PATCH') {
      try {
        const body = await request.json().catch(() => ({}));
        const data: { title?: string; status?: string; caseId?: string | null; dueDate?: Date | null; description?: string | null; assigneeId?: string | null; recurringTemplateId?: string | null } = {};
        if (body.title !== undefined) data.title = body.title;
        if (body.status !== undefined) data.status = body.status;
        if (body.caseId !== undefined) data.caseId = body.caseId ?? null;
        if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
        if (body.description !== undefined) data.description = body.description;
        if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId ?? null;
        if (body.recurringTemplateId !== undefined) data.recurringTemplateId = body.recurringTemplateId ?? null;
        const t = await prisma.task.update({ where: { id }, data });
        return NextResponse.json(t);
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
      }
    }
    if (method === 'DELETE') {
      const t = await prisma.task.findFirst({ where: { id, deletedAt: null } });
      if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      await prisma.task.update({ where: { id }, data: { deletedAt: new Date() } });
      return NextResponse.json({ message: 'OK' });
    }
    return methodNotAllowed();
  }
  if (method === 'GET') {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');
    const assigneeId = searchParams.get('assigneeId');
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const where: Prisma.TaskWhereInput = { deletedAt: null };
    if (caseId) where.caseId = caseId;
    if (assigneeId) where.assigneeId = assigneeId;
    if (status) where.status = status;
    if (from || to) {
      where.dueDate = {};
      if (from) (where.dueDate as Prisma.DateTimeNullableFilter).gte = new Date(from);
      if (to) (where.dueDate as Prisma.DateTimeNullableFilter).lte = new Date(to);
    }
    const list = await prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { case: { select: { id: true, title: true, caseNumber: true } } },
    });
    return NextResponse.json({ data: list });
  }
  if (method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      if (!body.title) return NextResponse.json({ error: 'title required' }, { status: 400 });
      const t = await prisma.task.create({
        data: {
          title: body.title,
          status: body.status ?? 'pending',
          caseId: body.caseId ?? null,
          description: body.description ?? null,
          assigneeId: body.assigneeId ?? null,
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          recurringTemplateId: body.recurringTemplateId ?? null,
        },
      });
      return NextResponse.json(t, { status: 201 });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }
  return methodNotAllowed();
}

// --- M2: Time Tracking ---
async function handleTimeEntries(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  if (rest[0] === 'case' && rest[1] && method === 'GET') {
    const list = await prisma.timeEntry.findMany({
      where: { caseId: rest[1], deletedAt: null },
      orderBy: { workDate: 'desc' },
      include: { user: { select: { id: true, name: true } }, task: { select: { id: true, title: true } } },
    });
    return NextResponse.json({ data: list });
  }
  const id = rest[0];
  if (id && rest[1] === 'approve' && method === 'POST') {
    const e = await prisma.timeEntry.findFirst({ where: { id, deletedAt: null } });
    if (!e) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const updated = await prisma.timeEntry.update({
      where: { id },
      data: { approvedAt: new Date() },
      include: { case: { select: { id: true, title: true } }, user: { select: { id: true, name: true } } },
    });
    return NextResponse.json(updated);
  }
  if (id && (method === 'PATCH' || method === 'PUT') && !rest[1]) {
    const e = await prisma.timeEntry.findFirst({ where: { id, deletedAt: null } });
    if (!e) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    try {
      const body = await request.json().catch(() => ({}));
      const data: { description?: string | null; hours?: number; billable?: boolean; rate?: number | null; workDate?: Date } = {};
      if (body.description !== undefined) data.description = body.description?.trim() || null;
      if (body.hours != null) data.hours = Number(body.hours);
      if (body.billable !== undefined) data.billable = !!body.billable;
      if (body.rate !== undefined) data.rate = body.rate == null ? null : Number(body.rate);
      if (body.workDate !== undefined) data.workDate = new Date(body.workDate);
      const updated = await prisma.timeEntry.update({
        where: { id },
        data,
        include: { case: { select: { id: true, title: true } }, user: { select: { id: true, name: true } }, task: { select: { id: true, title: true } } },
      });
      return NextResponse.json(updated);
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'Invalid request' }, { status: 400 });
    }
  }
  if (id && method === 'GET') {
    const e = await prisma.timeEntry.findFirst({
      where: { id, deletedAt: null },
      include: { case: true, user: true, task: true },
    });
    return e ? NextResponse.json(e) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (method === 'GET') {
    const list = await prisma.timeEntry.findMany({
      where: { deletedAt: null },
      orderBy: { workDate: 'desc' },
      take: 500,
      include: { case: { select: { id: true, title: true, clientId: true } }, user: { select: { id: true, name: true } }, task: { select: { id: true, title: true } } },
    });
    return NextResponse.json({ data: list });
  }
  if (method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      if (!body.caseId || body.hours == null) return NextResponse.json({ error: 'caseId and hours required' }, { status: 400 });
      const e = await prisma.timeEntry.create({
        data: {
          caseId: body.caseId,
          taskId: body.taskId ?? null,
          userId: body.userId ?? (await prisma.user.findFirst({ where: { deletedAt: null }, select: { id: true } }))?.id!,
          description: body.description ?? null,
          hours: Number(body.hours),
          billable: body.billable !== false,
          rate: body.rate != null ? Number(body.rate) : null,
          workDate: body.workDate ? new Date(body.workDate) : new Date(),
        },
        include: { case: { select: { id: true, title: true } }, user: { select: { id: true, name: true } } },
      });
      return NextResponse.json(e, { status: 201 });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }
  return methodNotAllowed();
}

// --- M3: Case Expenses ---
async function handleExpenses(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const id = rest[0];
  if (id && rest[1] === 'approve' && method === 'POST') {
    const e = await prisma.caseExpense.findFirst({ where: { id, deletedAt: null } });
    if (!e) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const updated = await prisma.caseExpense.update({ where: { id }, data: { approvedAt: new Date() } });
    return NextResponse.json(updated);
  }
  if (id && method === 'GET') {
    const e = await prisma.caseExpense.findFirst({
      where: { id, deletedAt: null },
      include: { case: true },
    });
    return e ? NextResponse.json(e) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (rest[0] === 'case' && rest[1] && method === 'GET') {
    const list = await prisma.caseExpense.findMany({
      where: { caseId: rest[1], deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ data: list });
  }
  if (method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      if (!body.caseId || body.amount == null) return NextResponse.json({ error: 'caseId and amount required' }, { status: 400 });
      const e = await prisma.caseExpense.create({
        data: {
          caseId: body.caseId,
          description: body.description ?? 'Expense',
          amount: Number(body.amount),
          proofUrl: body.proofUrl ?? null,
          reimbursable: !!body.reimbursable,
        },
      });
      return NextResponse.json(e, { status: 201 });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }
  return methodNotAllowed();
}

// --- Rate cards (per lawyer) ---
async function handleRateCards(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const id = rest[0];
  if (id && method === 'GET') {
    const r = await prisma.rateCard.findFirst({ where: { id } });
    return r ? NextResponse.json(r) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (method === 'GET') {
    const userId = request.nextUrl.searchParams.get('userId');
    const list = await prisma.rateCard.findMany({
      where: userId ? { userId } : {},
      orderBy: { effectiveFrom: 'desc' },
      take: 200,
    });
    return NextResponse.json({ data: list });
  }
  if (method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      if (!body.userId || body.rate == null) return NextResponse.json({ error: 'userId and rate required' }, { status: 400 });
      const r = await prisma.rateCard.create({
        data: {
          userId: body.userId,
          rate: Number(body.rate),
          effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : new Date(),
          effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null,
        },
      });
      return NextResponse.json(r, { status: 201 });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }
  return methodNotAllowed();
}

const DOCUMENT_MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB (Vercel request body ~4.5 MB)
const DOCUMENT_ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.png', '.jpg', '.jpeg', '.gif', '.webp'];

function isAllowedDocumentFilename(name: string): boolean {
  const lower = name.toLowerCase();
  return DOCUMENT_ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

async function handleDocumentFileUpload(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const caseId = (formData.get('caseId') as string)?.trim() || null;
    const files: File[] = [];
    const filesField = formData.getAll('files');
    for (const f of filesField) {
      if (f instanceof File && f.size > 0) files.push(f);
    }
    if (formData.get('file') instanceof File) {
      const single = formData.get('file') as File;
      if (single.size > 0) files.push(single);
    }
    if (files.length === 0) {
      return NextResponse.json({ error: 'Pilih minimal satu file' }, { status: 400 });
    }
    for (const file of files) {
      if (file.size > DOCUMENT_MAX_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File "${file.name}" melebihi batas ${DOCUMENT_MAX_SIZE_BYTES / 1024 / 1024} MB` },
          { status: 400 }
        );
      }
      if (!isAllowedDocumentFilename(file.name)) {
        return NextResponse.json(
          { error: `Format file "${file.name}" tidak diizinkan. Gunakan: ${DOCUMENT_ALLOWED_EXTENSIONS.join(', ')}` },
          { status: 400 }
        );
      }
    }
    const created: { id: string; name: string; fileUrl: string | null }[] = [];
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;

    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) || 'document';
      let fileUrl: string;

      if (hasBlobToken) {
        const { put } = await import('@vercel/blob');
        const { url } = await put(`documents/${Date.now()}-${safeName}`, file, { access: 'public' });
        fileUrl = url;
      } else {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        try {
          await mkdir(uploadDir, { recursive: true });
        } catch (err) {
          console.error('document upload: mkdir failed', err);
          return NextResponse.json(
            {
              error:
                'Upload file tidak dikonfigurasi. Set BLOB_READ_WRITE_TOKEN (Vercel Blob) di env, atau jalankan di lingkungan yang mendukung penyimpanan lokal.',
            },
            { status: 503 }
          );
        }
        const filename = `${Date.now()}-${safeName}`;
        const filepath = path.join(uploadDir, filename);
        await writeFile(filepath, Buffer.from(await file.arrayBuffer()));
        fileUrl = `/uploads/${filename}`;
      }

      const doc = await prisma.document.create({
        data: {
          name: file.name.slice(0, 500),
          fileUrl,
          caseId,
          clientVisible: false,
        },
      });
      created.push({ id: doc.id, name: doc.name, fileUrl: doc.fileUrl });
    }
    return NextResponse.json({ data: created, count: created.length }, { status: 201 });
  } catch (e) {
    console.error('document file upload error', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Upload gagal' },
      { status: 500 }
    );
  }
}

async function handleDocuments(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const auth = await getAuthFromRequest(request, 'admin');
  if (rest[0] === 'upload' && method === 'POST') {
    return handleDocumentFileUpload(request);
  }
  if (rest[0] === 'generate-from-template' && method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      const templateId = body.templateId ?? body.template_id;
      const caseId = body.caseId ?? body.case_id;
      const outputName = body.outputName ?? body.output_name ?? 'Generated Document';
      if (!templateId || !caseId) return NextResponse.json({ error: 'templateId and caseId required' }, { status: 400 });
      const template = await prisma.documentTemplate.findFirst({ where: { id: templateId, deletedAt: null } });
      const c = await prisma.case.findFirst({ where: { id: caseId, deletedAt: null }, include: { client: true } });
      if (!template || !c) return NextResponse.json({ error: 'Template or case not found' }, { status: 404 });
      const mergeFields = (template.mergeFields as Record<string, string>) ?? {};
      let name = outputName;
      for (const [key, val] of Object.entries(mergeFields)) {
        const placeholder = `{{${key}}}`;
        if (key === 'case.case_number' || key === 'case_number') name = name.replace(placeholder, (c.caseNumber ?? '') as string);
        else if (key === 'case.title' || key === 'case_title') name = name.replace(placeholder, c.title);
        else if (key === 'client.name' || key === 'client_name') name = name.replace(placeholder, c.client?.name ?? '');
        else if (key === 'date') name = name.replace(placeholder, new Date().toISOString().slice(0, 10));
        else name = name.replace(placeholder, String(val ?? ''));
      }
      const doc = await prisma.document.create({
        data: { caseId: c.id, name, folder: template.category ?? null, fileUrl: template.fileUrl, clientVisible: false },
      });
      return NextResponse.json(doc, { status: 201 });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }
  const id = rest[0];
  if (id && id !== 'case' && id !== 'bulk-upload' && id !== 'generate-from-template') {
    if (rest[1] === 'check-out' && method === 'POST') {
      const d = await prisma.document.findFirst({ where: { id, deletedAt: null } });
      if (!d) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (d.checkedOutById) return NextResponse.json({ error: 'Document already checked out' }, { status: 400 });
      const userId = auth?.userId;
      if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const updated = await prisma.document.update({
        where: { id },
        data: { checkedOutById: userId, checkedOutAt: new Date() },
        include: { checkedOutByUser: { select: { id: true, name: true, email: true } } },
      });
      await prisma.documentAuditLog.create({ data: { documentId: id, userId, action: 'check_out' } }).catch(() => {});
      return NextResponse.json(updated);
    }
    if (rest[1] === 'check-in' && method === 'POST') {
      const d = await prisma.document.findFirst({ where: { id, deletedAt: null } });
      if (!d) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const userId = auth?.userId;
      if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const updated = await prisma.document.update({
        where: { id },
        data: { checkedOutById: null, checkedOutAt: null, version: d.version + 1 },
        include: { checkedOutByUser: { select: { id: true, name: true } } },
      });
      await prisma.documentAuditLog.create({ data: { documentId: id, userId, action: 'check_in' } }).catch(() => {});
      return NextResponse.json(updated);
    }
    if (rest[1] === 'audit-log' && method === 'GET') {
      const d = await prisma.document.findFirst({ where: { id, deletedAt: null } });
      if (!d) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const logs = await prisma.documentAuditLog.findMany({ where: { documentId: id }, orderBy: { createdAt: 'desc' }, take: 200 });
      return NextResponse.json({ data: logs });
    }
    if (rest[1] === 'signing-request' && method === 'POST') {
      const d = await prisma.document.findFirst({ where: { id, deletedAt: null } });
      if (!d) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (d.esignStatus === 'signing' || d.esignStatus === 'completed') {
        return NextResponse.json({ error: 'Dokumen sedang atau sudah dalam proses tanda tangan' }, { status: 423 });
      }
      const body = await request.json().catch(() => ({}));
      const signers = Array.isArray(body.signers) ? body.signers : [];
      if (signers.length === 0) return NextResponse.json({ error: 'signers array required (email, name)' }, { status: 400 });
      const existing = await prisma.documentSigningRequest.findFirst({ where: { documentId: id }, include: { signers: true } });
      if (existing && existing.status !== 'cancelled') return NextResponse.json({ error: 'Signing request already exists for this document' }, { status: 400 });
      const expiryAt = body.expiryAt ?? body.expiry_at;
      const expiryDate = expiryAt ? new Date(expiryAt) : null;
      if (expiryDate && isNaN(expiryDate.getTime())) return NextResponse.json({ error: 'expiryAt invalid' }, { status: 400 });
      // Hash document fingerprint at time of signing request
      const docFingerprint = `${d.id}|${d.name}|${d.fileUrl ?? ''}|${d.caseId ?? ''}|v${d.version}|${d.createdAt.toISOString()}`;
      const docHash = sha256(docFingerprint);
      const req = await prisma.documentSigningRequest.create({
        data: {
          documentId: id,
          status: 'pending',
          expiryAt: expiryDate,
          signers: {
            create: signers.map((s: { email: string; name?: string }, i: number) => ({
              email: (s.email ?? '').trim().toLowerCase(),
              name: (s.name ?? s.email ?? 'Signer').trim(),
              sortOrder: i,
            })),
          },
        },
        include: { signers: true },
      });
      await prisma.document.update({
        where: { id },
        data: { esignStatus: 'signing', esignDocHash: docHash, esignLockedAt: new Date() },
      }).catch(() => {});
      return NextResponse.json(req, { status: 201 });
    }
    if (rest[1] === 'signing-request' && method === 'GET') {
      const d = await prisma.document.findFirst({ where: { id, deletedAt: null } });
      if (!d) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const req = await prisma.documentSigningRequest.findFirst({
        where: { documentId: id },
        orderBy: { createdAt: 'desc' },
        include: { signers: { orderBy: { sortOrder: 'asc' } } },
      });
      return NextResponse.json(req ?? { status: 'none', signers: [] });
    }
    if (rest[1] === 'signing-request' && rest[2] === 'sign' && method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const signerId = body.signerId ?? body.signer_id;
      const signerEmail = (body.signerEmail ?? body.signer_email ?? body.email)?.trim()?.toLowerCase();
      const signatureData = (body.signatureData ?? body.signature_data) ?? null;
      // Capture IP and user-agent for audit trail
      const signerIp = (request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? '').split(',')[0].trim() || null;
      const signerUserAgent = (request.headers.get('user-agent') ?? '').slice(0, 512) || null;
      const req = await prisma.documentSigningRequest.findFirst({
        where: { documentId: id },
        include: { signers: true },
      });
      if (!req) return NextResponse.json({ error: 'Signing request not found' }, { status: 404 });
      if (req.status === 'completed') return NextResponse.json({ error: 'Already completed' }, { status: 400 });
      if (req.cancelledAt) return NextResponse.json({ error: 'Signing request has been cancelled' }, { status: 410 });
      const now = new Date();
      if (req.expiryAt && now > req.expiryAt) return NextResponse.json({ error: 'Signing request has expired' }, { status: 410 });
      let signer = signerId ? req.signers.find((s) => s.id === signerId) : req.signers.find((s) => s.email === signerEmail);
      if (!signer) return NextResponse.json({ error: 'Signer not found' }, { status: 404 });
      if (signer.signedAt) return NextResponse.json({ error: 'Already signed' }, { status: 400 });
      await prisma.documentSigner.update({
        where: { id: signer.id },
        data: { signedAt: new Date(), signatureData, signerIp, signerUserAgent },
      });
      const allSigned = req.signers.every((s) => (s.id === signer!.id ? true : !!s.signedAt));
      if (allSigned) {
        await prisma.documentSigningRequest.update({ where: { id: req.id }, data: { status: 'completed' } });
        const completionHash = sha256(`completed|${id}|${new Date().toISOString()}`);
        await prisma.document.update({
          where: { id },
          data: { esignStatus: 'completed', esignSignedAt: new Date(), esignDocHash: completionHash },
        }).catch(() => {});
      }
      const updated = await prisma.documentSigningRequest.findFirst({
        where: { id: req.id },
        include: { signers: { orderBy: { sortOrder: 'asc' } } },
      });
      return NextResponse.json(updated);
    }
    if (rest[1] === 'signing-request' && rest[2] === 'cancel' && method === 'POST') {
      const authUser = await getAuthFromRequest(request, 'admin');
      if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const req = await prisma.documentSigningRequest.findFirst({
        where: { documentId: id },
        include: { document: true, signers: true },
      });
      if (!req) return NextResponse.json({ error: 'Signing request not found' }, { status: 404 });
      if (req.status === 'completed') return NextResponse.json({ error: 'Cannot cancel completed request' }, { status: 400 });
      if (req.cancelledAt) return NextResponse.json({ error: 'Already cancelled' }, { status: 400 });
      await prisma.documentSigningRequest.update({
        where: { id: req.id },
        data: { status: 'cancelled', cancelledAt: new Date(), cancelledById: authUser.userId },
      });
      await prisma.document.update({
        where: { id },
        data: { esignStatus: null, esignLockedAt: null, esignDocHash: null },
      }).catch(() => {});
      const updated = await prisma.documentSigningRequest.findFirst({
        where: { id: req.id },
        include: { signers: { orderBy: { sortOrder: 'asc' } } },
      });
      return NextResponse.json(updated);
    }
    if (rest[1] === 'signing-request' && rest[2] === 'certificate' && method === 'GET') {
      const req = await prisma.documentSigningRequest.findFirst({
        where: { documentId: id },
        include: { document: { select: { id: true, name: true, esignDocHash: true, esignSignedAt: true } }, signers: { orderBy: { sortOrder: 'asc' } } },
      });
      if (!req) return NextResponse.json({ error: 'Signing request not found' }, { status: 404 });
      const format = request.nextUrl.searchParams.get('format') || 'json';
      const audit = {
        documentId: req.documentId,
        documentName: req.document?.name,
        requestId: req.id,
        status: req.status,
        createdAt: req.createdAt,
        expiryAt: req.expiryAt,
        completedAt: req.status === 'completed' ? req.updatedAt : null,
        cancelledAt: req.cancelledAt,
        signers: req.signers.map((s) => ({
          email: s.email,
          name: s.name,
          signedAt: s.signedAt,
          signerIp: s.signerIp,
          signerUserAgent: s.signerUserAgent,
        })),
      };
      if (format === 'pdf') {
        try {
          const pdfBuffer = await generateAuditCertificatePdf(audit);
          return new NextResponse(new Uint8Array(pdfBuffer), {
            headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="signing-certificate-${id}.pdf"` },
          });
        } catch {
          return NextResponse.json({ error: 'PDF export not available; use format=json' }, { status: 501 });
        }
      }
      return NextResponse.json(audit);
    }
    if (rest[1] === 'send-for-signature' && method === 'POST') {
      const d = await prisma.document.findFirst({ where: { id, deletedAt: null } });
      if (!d) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const body = await request.json().catch(() => ({}));
      const envelopeId = body.envelopeId ?? `stub-${id}-${Date.now()}`;
      const updated = await prisma.document.update({
        where: { id },
        data: { esignEnvelopeId: envelopeId, esignStatus: 'pending' },
      });
      return NextResponse.json(updated);
    }
    if (method === 'GET') {
      const d = await prisma.document.findFirst({
        where: { id, deletedAt: null },
        include: { checkedOutByUser: { select: { id: true, name: true, email: true } }, case: { select: { id: true, title: true, caseNumber: true } } },
      });
      if (d && auth?.userId) {
        await prisma.documentAuditLog.create({ data: { documentId: id, userId: auth.userId, action: 'view' } }).catch(() => {});
      }
      return d ? NextResponse.json(d) : NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (method === 'PUT' || method === 'PATCH') {
      const body = await request.json().catch(() => ({}));
      const data: Prisma.DocumentUpdateInput = {};
      if (body.name !== undefined) data.name = body.name;
      if (body.folder !== undefined) data.folder = body.folder ?? null;
      if (body.clientVisible !== undefined) data.clientVisible = !!body.clientVisible;
      if (body.version !== undefined) data.version = Number(body.version) || 1;
      if (body.permissionPolicy !== undefined) data.permissionPolicy = body.permissionPolicy as Prisma.InputJsonValue;
      const d = await prisma.document.update({ where: { id }, data });
      return NextResponse.json(d);
    }
    if (method === 'DELETE') {
      const existing = await prisma.document.findFirst({ where: { id, deletedAt: null } });
      if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      await prisma.document.update({ where: { id }, data: { deletedAt: new Date() } });
      return NextResponse.json({ message: 'OK' });
    }
  }
  if (rest[0] === 'case' && rest[1] && method === 'GET') {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder');
    const where: Prisma.DocumentWhereInput = { caseId: rest[1], deletedAt: null };
    if (folder) where.folder = folder;
    const list = await prisma.document.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { checkedOutByUser: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ data: list });
  }
  if (rest[0] === 'bulk-upload' && method === 'POST') {
    try {
      const body = await request.json();
      const items = Array.isArray(body.documents) ? body.documents : Array.isArray(body) ? body : [];
      if (items.length === 0) return NextResponse.json({ error: 'documents array required' }, { status: 400 });
      const caseId = body.caseId ?? items[0]?.caseId ?? null;
      const created = await prisma.$transaction(
        items.map((d: { name: string; caseId?: string; folder?: string; clientVisible?: boolean; version?: number }) =>
          prisma.document.create({
            data: {
              name: String(d.name ?? 'Unnamed'),
              caseId: d.caseId ?? caseId,
              folder: d.folder ?? null,
              clientVisible: !!d.clientVisible,
              version: d.version ?? 1,
            },
          })
        )
      );
      return NextResponse.json({ data: created, count: created.length }, { status: 201 });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }
  if (method === 'GET') {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');
    const clientVisible = searchParams.get('clientVisible');
    const folder = searchParams.get('folder');
    const where: Prisma.DocumentWhereInput = { deletedAt: null };
    if (caseId) where.caseId = caseId;
    if (clientVisible !== undefined && clientVisible !== '') where.clientVisible = clientVisible === 'true';
    if (folder) where.folder = folder;
    const list = await prisma.document.findMany({
      where,
      take: 500,
      orderBy: { updatedAt: 'desc' },
      include: { case: { select: { id: true, title: true, caseNumber: true } }, checkedOutByUser: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ data: list });
  }
  return methodNotAllowed();
}

async function handleBilling(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  if ((!rest[0] || rest[0] === 'invoices') && method === 'GET' && !rest[1]) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const where: Prisma.InvoiceWhereInput = { deletedAt: null };
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(from);
      if (to) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(to);
    }
    const list = await prisma.invoice.findMany({
      where,
      take: 500,
      orderBy: { createdAt: 'desc' },
      include: { client: { select: { id: true, name: true } } },
    });
    const agg = await prisma.invoice.aggregate({ where: { deletedAt: null }, _sum: { amount: true }, _count: true });
    return NextResponse.json({
      data: list,
      summary: { totalInvoices: agg._count, totalAmount: Number(agg._sum.amount ?? 0) },
    });
  }
  if (rest[0] === 'invoices' && rest[1] && !rest[2] && method === 'GET') {
    const i = await prisma.invoice.findFirst({ where: { id: rest[1], deletedAt: null } });
    return i ? NextResponse.json(i) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (rest[0] === 'invoices' && rest[1] && rest[2] === 'approve' && method === 'POST') {
    const inv = await prisma.invoice.findFirst({ where: { id: rest[1], deletedAt: null } });
    if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const updated = await prisma.invoice.update({ where: { id: rest[1] }, data: { status: 'sent' } });
    return NextResponse.json(updated);
  }
  if (rest[0] === 'invoices' && rest[1] && rest[2] === 'write-off' && method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      const inv = await prisma.invoice.findFirst({ where: { id: rest[1], deletedAt: null } });
      if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (inv.status !== 'draft') return NextResponse.json({ error: 'Hanya invoice draft yang bisa di-write-off' }, { status: 400 });
      const writeOffAmount = Number(body.writeOffAmount) ?? 0;
      const writeOffReason = body.writeOffReason ?? null;
      const updated = await prisma.invoice.update({
        where: { id: rest[1] },
        data: { writeOffAmount, writeOffReason, writeOffAt: new Date(), amount: Number(inv.amount) - writeOffAmount },
      });
      return NextResponse.json(updated);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }
  if (rest[0] === 'invoices' && rest[1] && !rest[2] && (method === 'PUT' || method === 'PATCH')) {
    try {
      const body = await request.json().catch(() => ({}));
      const inv = await prisma.invoice.findFirst({ where: { id: rest[1], deletedAt: null } });
      if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const data: {
        status?: string; paidAmount?: unknown; invoiceNumber?: string; clientId?: string | null; dueDate?: Date | null;
        writeOffAmount?: number; writeOffReason?: string | null; taxRate?: number | null; currency?: string; retainerDrawdownAmount?: number;
      } = {};
      if (body.status !== undefined) data.status = body.status;
      if (body.paidAmount !== undefined) data.paidAmount = body.paidAmount;
      if (body.invoiceNumber !== undefined) data.invoiceNumber = body.invoiceNumber;
      if (body.clientId !== undefined) data.clientId = body.clientId ?? null;
      if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
      if (body.writeOffAmount !== undefined) data.writeOffAmount = Number(body.writeOffAmount);
      if (body.writeOffReason !== undefined) data.writeOffReason = body.writeOffReason ?? null;
      if (body.taxRate !== undefined) data.taxRate = body.taxRate != null ? Number(body.taxRate) : null;
      if (body.currency !== undefined) data.currency = body.currency ?? 'IDR';
      if (body.retainerDrawdownAmount !== undefined) data.retainerDrawdownAmount = Number(body.retainerDrawdownAmount);
      const updateData: Prisma.InvoiceUpdateInput = {};
      if (data.status !== undefined) updateData.status = data.status;
      if (data.paidAmount !== undefined) updateData.paidAmount = data.paidAmount as number;
      if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
      if (data.clientId === null) updateData.client = { disconnect: true };
      else if (data.clientId !== undefined) updateData.client = { connect: { id: data.clientId } };
      if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
      if (data.writeOffAmount !== undefined) updateData.writeOffAmount = data.writeOffAmount;
      if (data.writeOffReason !== undefined) updateData.writeOffReason = data.writeOffReason;
      if (data.taxRate !== undefined) updateData.taxRate = data.taxRate;
      if (data.currency !== undefined) updateData.currency = data.currency;
      if (data.retainerDrawdownAmount !== undefined) updateData.retainerDrawdownAmount = data.retainerDrawdownAmount;
      const updated = await prisma.invoice.update({ where: { id: rest[1] }, data: updateData });
      const total = Number(updated.amount);
      const paid = Number(updated.paidAmount);
      if (paid >= total && total > 0) await prisma.invoice.update({ where: { id: rest[1] }, data: { status: 'paid' } });
      else if (paid > 0) await prisma.invoice.update({ where: { id: rest[1] }, data: { status: 'partial_paid' } });
      return NextResponse.json(await prisma.invoice.findUnique({ where: { id: rest[1] } }));
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }
  // POST billing/invoices/from-time-entries — generate invoice from approved time entries
  if (rest[0] === 'invoices' && rest[1] === 'from-time-entries' && method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      const timeEntryIds = Array.isArray(body.timeEntryIds) ? body.timeEntryIds as string[] : [];
      if (timeEntryIds.length === 0) return NextResponse.json({ error: 'timeEntryIds array required and non-empty' }, { status: 400 });
      const entries = await prisma.timeEntry.findMany({
        where: { id: { in: timeEntryIds }, deletedAt: null, invoiceId: null, approvedAt: { not: null } },
        include: { case: { select: { id: true, clientId: true } } },
      });
      if (entries.length !== timeEntryIds.length) {
        return NextResponse.json({ error: 'Some entries not found, already invoiced, or not approved' }, { status: 400 });
      }
      const clientId = (body.clientId as string) || entries[0].case?.clientId;
      if (!clientId) return NextResponse.json({ error: 'clientId required (or ensure all entries belong to a case with client)' }, { status: 400 });
      let total = 0;
      for (const e of entries) {
        const rate = e.rate != null ? Number(e.rate) : 0;
        total += Number(e.hours) * rate;
      }
      const auth = await getAuthFromRequest(request, 'admin');
      const firmId = auth?.firmId ?? null;
      let invoiceNumber = (body.invoiceNumber as string)?.trim() || null;
      if (!invoiceNumber && firmId) {
        try {
          const year = new Date().getFullYear();
          const seq = await getNextNumber(firmId, 'invoice', String(year));
          const prefix = (await prisma.firmConfig.findUnique({ where: { firmId_key: { firmId, key: 'invoice_number_prefix' } } }))?.value as string | null;
          invoiceNumber = formatInvoiceNumber(prefix ?? null, year, seq);
        } catch {
          invoiceNumber = `INV-${Date.now()}`;
        }
      }
      if (!invoiceNumber) invoiceNumber = `INV-${Date.now()}`;
      const dueDate = body.dueDate ? new Date(body.dueDate) : null;
      const inv = await prisma.invoice.create({
        data: {
          firmId,
          status: 'draft',
          amount: total,
          paidAmount: 0,
          invoiceNumber,
          clientId,
          dueDate,
          currency: (body.currency as string) ?? 'IDR',
        },
      });
      await prisma.timeEntry.updateMany({
        where: { id: { in: timeEntryIds } },
        data: { invoiceId: inv.id },
      });
      const created = await prisma.invoice.findUnique({
        where: { id: inv.id },
        include: { client: { select: { id: true, name: true } } },
      });
      return NextResponse.json(created, { status: 201 });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }

  if (rest[0] === 'invoices' && !rest[1] && method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      const amount = Number(body.amount) || 0;
      const paidAmount = Number(body.paidAmount) || 0;
      const auth = await getAuthFromRequest(request, 'admin');
      const firmId = auth?.firmId ?? null;
      let invoiceNumber = (body.invoiceNumber as string)?.trim() || null;
      if (!invoiceNumber && firmId) {
        try {
          const year = new Date().getFullYear();
          const seq = await getNextNumber(firmId, 'invoice', String(year));
          const prefix = (await prisma.firmConfig.findUnique({ where: { firmId_key: { firmId, key: 'invoice_number_prefix' } } }))?.value as string | null;
          invoiceNumber = formatInvoiceNumber(prefix ?? null, year, seq);
        } catch {
          invoiceNumber = `INV-${Date.now()}`;
        }
      }
      if (!invoiceNumber) invoiceNumber = `INV-${Date.now()}`;
      const inv = await prisma.invoice.create({
        data: {
          firmId,
          status: body.status ?? 'draft',
          amount,
          paidAmount,
          invoiceNumber,
          clientId: body.clientId ?? null,
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          taxRate: body.taxRate != null ? Number(body.taxRate) : null,
          currency: body.currency ?? 'IDR',
        },
      });
      return NextResponse.json(inv, { status: 201 });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }
  return methodNotAllowed();
}

async function handleTrustAccounts(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const clientId = rest[0] || new URL(request.url).searchParams.get('clientId');
  if (!clientId && method === 'GET' && !rest[0]) {
    const list = await prisma.clientTrustAccount.findMany({ include: { client: { select: { id: true, name: true } } }, orderBy: { updatedAt: 'desc' } });
    return NextResponse.json({ data: list });
  }
  if (clientId) {
    if (method === 'GET') {
      let account = await prisma.clientTrustAccount.findUnique({ where: { clientId }, include: { transactions: { orderBy: { createdAt: 'desc' }, take: 50 } } });
      if (!account) {
        account = await prisma.clientTrustAccount.create({ data: { clientId, balance: 0, currency: 'IDR' }, include: { transactions: true } });
      }
      return NextResponse.json(account);
    }
    if (method === 'POST') {
      try {
        const body = await request.json().catch(() => ({}));
        const type = (body.type ?? 'deposit') as string;
        const amount = Number(body.amount) ?? 0;
        const note = body.note ?? null;
        if (amount <= 0) return NextResponse.json({ error: 'amount must be positive' }, { status: 400 });
        let account = await prisma.clientTrustAccount.findUnique({ where: { clientId } });
        if (!account) account = await prisma.clientTrustAccount.create({ data: { clientId, balance: 0, currency: 'IDR' } });
        const delta = type === 'deposit' || type === 'refund' ? amount : -amount;
        if (type === 'drawdown' && Number(account.balance) < amount) return NextResponse.json({ error: 'Saldo retainer tidak cukup' }, { status: 400 });
        const [updated] = await prisma.$transaction([
          prisma.clientTrustAccount.update({ where: { id: account.id }, data: { balance: { increment: delta } } }),
          prisma.trustTransaction.create({ data: { accountId: account.id, type, amount: type === 'drawdown' ? -amount : amount, note } }),
        ]);
        const withTransactions = await prisma.clientTrustAccount.findUnique({ where: { id: updated.id }, include: { transactions: { orderBy: { createdAt: 'desc' }, take: 20 } } });
        return NextResponse.json(withTransactions);
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
      }
    }
  }
  return methodNotAllowed();
}

async function handleRateRules(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const id = rest[0];
  if (id && method === 'GET') {
    const r = await prisma.rateRule.findFirst({ where: { id, deletedAt: null } });
    return r ? NextResponse.json(r) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (id && (method === 'PUT' || method === 'PATCH')) {
    try {
      const body = await request.json().catch(() => ({}));
      const r = await prisma.rateRule.findFirst({ where: { id, deletedAt: null } });
      if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const updated = await prisma.rateRule.update({
        where: { id },
        data: {
          caseId: body.caseId ?? r.caseId,
          userId: body.userId ?? r.userId,
          activityType: body.activityType ?? r.activityType,
          rateType: body.rateType ?? r.rateType,
          rate: body.rate != null ? Number(body.rate) : r.rate,
          effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : r.effectiveFrom,
          effectiveTo: body.effectiveTo != null ? new Date(body.effectiveTo) : r.effectiveTo,
        },
      });
      return NextResponse.json(updated);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }
  if (id && method === 'DELETE') {
    const r = await prisma.rateRule.findFirst({ where: { id, deletedAt: null } });
    if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await prisma.rateRule.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ message: 'OK' });
  }
  if (method === 'GET') {
    const { searchParams } = new URL(request.url);
    const where: Prisma.RateRuleWhereInput = { deletedAt: null };
    if (searchParams.get('caseId')) where.caseId = searchParams.get('caseId');
    if (searchParams.get('userId')) where.userId = searchParams.get('userId');
    const list = await prisma.rateRule.findMany({ where, orderBy: { effectiveFrom: 'desc' }, take: 200 });
    return NextResponse.json({ data: list });
  }
  if (method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      if (!body.rateType || body.rate == null) return NextResponse.json({ error: 'rateType and rate required' }, { status: 400 });
      const r = await prisma.rateRule.create({
        data: {
          caseId: body.caseId ?? null,
          userId: body.userId ?? null,
          activityType: body.activityType ?? null,
          rateType: String(body.rateType),
          rate: Number(body.rate),
          effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : new Date(),
          effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null,
        },
      });
      return NextResponse.json(r, { status: 201 });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }
  return methodNotAllowed();
}

async function handleCreditNotes(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const id = rest[0];
  if (id && method === 'GET') {
    const c = await prisma.creditNote.findFirst({ where: { id }, include: { invoice: true } });
    return c ? NextResponse.json(c) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (id && (method === 'PUT' || method === 'PATCH')) {
    try {
      const body = await request.json().catch(() => ({}));
      const c = await prisma.creditNote.findFirst({ where: { id } });
      if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const updated = await prisma.creditNote.update({
        where: { id },
        data: { amount: body.amount != null ? Number(body.amount) : c.amount, reason: body.reason ?? c.reason, status: body.status ?? c.status },
      });
      return NextResponse.json(updated);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }
  if (id && method === 'DELETE') {
    const c = await prisma.creditNote.findFirst({ where: { id } });
    if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await prisma.creditNote.update({ where: { id }, data: { status: 'void' } });
    return NextResponse.json({ message: 'OK' });
  }
  if (method === 'GET') {
    const invoiceId = new URL(request.url).searchParams.get('invoiceId');
    const list = invoiceId
      ? await prisma.creditNote.findMany({ where: { invoiceId }, include: { invoice: { select: { id: true, invoiceNumber: true } } } })
      : await prisma.creditNote.findMany({ take: 200, orderBy: { createdAt: 'desc' }, include: { invoice: { select: { id: true, invoiceNumber: true } } } });
    return NextResponse.json({ data: list });
  }
  if (method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      if (!body.invoiceId || body.amount == null) return NextResponse.json({ error: 'invoiceId and amount required' }, { status: 400 });
      const c = await prisma.creditNote.create({
        data: {
          invoiceId: body.invoiceId,
          amount: Number(body.amount),
          reason: body.reason ?? null,
          status: body.status ?? 'draft',
        },
      });
      return NextResponse.json(c, { status: 201 });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }
  return methodNotAllowed();
}

async function handleRecurringTaskTemplates(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const id = rest[0];
  if (id && method === 'GET') {
    const r = await prisma.recurringTaskTemplate.findFirst({ where: { id, deletedAt: null }, include: { tasks: { take: 10 } } });
    return r ? NextResponse.json(r) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (id && (method === 'PUT' || method === 'PATCH')) {
    try {
      const body = await request.json().catch(() => ({}));
      const r = await prisma.recurringTaskTemplate.findFirst({ where: { id, deletedAt: null } });
      if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const updated = await prisma.recurringTaskTemplate.update({
        where: { id },
        data: {
          title: body.title ?? r.title,
          description: body.description ?? r.description,
          caseId: body.caseId ?? r.caseId,
          assigneeId: body.assigneeId ?? r.assigneeId,
          recurrence: body.recurrence ?? r.recurrence,
          nextRunAt: body.nextRunAt ? new Date(body.nextRunAt) : r.nextRunAt,
          isActive: body.isActive ?? r.isActive,
        },
      });
      return NextResponse.json(updated);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }
  if (id && method === 'DELETE') {
    const r = await prisma.recurringTaskTemplate.findFirst({ where: { id, deletedAt: null } });
    if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await prisma.recurringTaskTemplate.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ message: 'OK' });
  }
  if (method === 'GET') {
    const caseId = new URL(request.url).searchParams.get('caseId');
    const where: Prisma.RecurringTaskTemplateWhereInput = { deletedAt: null };
    if (caseId) where.caseId = caseId;
    const list = await prisma.recurringTaskTemplate.findMany({ where, orderBy: { nextRunAt: 'asc' }, take: 200 });
    return NextResponse.json({ data: list });
  }
  if (method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      if (!body.title || !body.recurrence) return NextResponse.json({ error: 'title and recurrence required' }, { status: 400 });
      const nextRun = body.nextRunAt ? new Date(body.nextRunAt) : new Date();
      const r = await prisma.recurringTaskTemplate.create({
        data: {
          title: body.title,
          description: body.description ?? null,
          caseId: body.caseId ?? null,
          assigneeId: body.assigneeId ?? null,
          recurrence: String(body.recurrence),
          nextRunAt: nextRun,
          isActive: body.isActive !== false,
        },
      });
      return NextResponse.json(r, { status: 201 });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }
  return methodNotAllowed();
}

async function handleEventsAdmin(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const id = rest[0];
  if (id && method === 'GET') {
    const e = await prisma.event.findFirst({
      where: { id, deletedAt: null },
      include: { case_: { select: { id: true, title: true, caseNumber: true } }, task: { select: { id: true, title: true } }, attendees: true },
    });
    return e ? NextResponse.json(e) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (id && (method === 'PUT' || method === 'PATCH')) {
    try {
      const body = await request.json().catch(() => ({}));
      const e = await prisma.event.findFirst({ where: { id, deletedAt: null } });
      if (!e) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const updated = await prisma.event.update({
        where: { id },
        data: {
          title: body.title ?? e.title,
          startAt: body.startAt ? new Date(body.startAt) : e.startAt,
          endAt: body.endAt != null ? (body.endAt ? new Date(body.endAt) : null) : e.endAt,
          type: body.type ?? e.type,
          caseId: body.caseId !== undefined ? body.caseId ?? null : e.caseId,
          taskId: body.taskId !== undefined ? body.taskId ?? null : e.taskId,
          location: body.location !== undefined ? body.location ?? null : e.location,
          reminderMinutes: body.reminderMinutes !== undefined ? body.reminderMinutes ?? null : e.reminderMinutes,
        },
      });
      if (body.attendees && Array.isArray(body.attendees)) {
        await prisma.eventAttendee.deleteMany({ where: { eventId: id } });
        for (const a of body.attendees) {
          if (a.attendeeType && (a.userId || a.clientContactId)) {
            await prisma.eventAttendee.create({
              data: { eventId: id, attendeeType: a.attendeeType, userId: a.userId ?? null, clientContactId: a.clientContactId ?? null, reminderMinutes: a.reminderMinutes ?? null },
            });
          }
        }
      }
      const withAttendees = await prisma.event.findFirst({ where: { id }, include: { attendees: true } });
      return NextResponse.json(withAttendees ?? updated);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }
  if (id && method === 'DELETE') {
    const e = await prisma.event.findFirst({ where: { id, deletedAt: null } });
    if (!e) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await prisma.event.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ message: 'OK' });
  }
  if (method === 'GET') {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const caseId = searchParams.get('caseId');
    const taskId = searchParams.get('taskId');
    const where: Prisma.EventWhereInput = { deletedAt: null };
    if (from || to) {
      where.startAt = {};
      if (from) (where.startAt as Prisma.DateTimeFilter).gte = new Date(from);
      if (to) (where.startAt as Prisma.DateTimeFilter).lte = new Date(to);
    }
    if (caseId) where.caseId = caseId;
    if (taskId) where.taskId = taskId;
    const list = await prisma.event.findMany({
      where,
      orderBy: { startAt: 'asc' },
      take: 300,
      include: {
        case_: {
          include: {
            teamMembers: { include: { user: { select: { id: true, name: true } } } },
            client: { select: { id: true, name: true } },
          },
        },
        task: { select: { id: true, title: true } },
        lead: {
          include: {
            client: { select: { id: true, name: true } },
            case: { include: { teamMembers: { include: { user: { select: { id: true, name: true } } } } } },
          },
        },
      },
    });
    return NextResponse.json({ data: list });
  }
  if (method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      if (!body.title || !body.startAt) return NextResponse.json({ error: 'title and startAt required' }, { status: 400 });
      const e = await prisma.event.create({
        data: {
          title: body.title,
          startAt: new Date(body.startAt),
          endAt: body.endAt ? new Date(body.endAt) : null,
          type: body.type ?? null,
          leadId: body.leadId ?? null,
          caseId: body.caseId ?? null,
          taskId: body.taskId ?? null,
          location: body.location ?? null,
          reminderMinutes: body.reminderMinutes ?? null,
        },
      });
      if (body.attendees && Array.isArray(body.attendees)) {
        for (const a of body.attendees) {
          if (a.attendeeType && (a.userId || a.clientContactId)) {
            await prisma.eventAttendee.create({
              data: { eventId: e.id, attendeeType: a.attendeeType, userId: a.userId ?? null, clientContactId: a.clientContactId ?? null, reminderMinutes: a.reminderMinutes ?? null },
            });
          }
        }
      }
      const withAttendees = await prisma.event.findFirst({ where: { id: e.id }, include: { attendees: true } });
      return NextResponse.json(withAttendees ?? e, { status: 201 });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }
  return methodNotAllowed();
}

async function handleReports(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  if (method !== 'GET') return methodNotAllowed();

  // --- SLA breach analytics: cases that have been escalated (SLA terlewati)
  if (rest[0] === 'sla-breach') {
    const auth = await getAuthFromRequest(request, 'admin');
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const q = request.nextUrl.searchParams;
    const firmId = auth.firmId ?? q.get('firmId') ?? null;
    const from = q.get('from');
    const to = q.get('to');
    const escalatedFilter: Prisma.DateTimeNullableFilter = { not: null };
    if (from) escalatedFilter.gte = new Date(from);
    if (to) escalatedFilter.lte = new Date(to);
    const where: Prisma.CaseWhereInput = { deletedAt: null, escalatedAt: escalatedFilter };
    if (firmId) where.firmId = firmId;
    const cases = await prisma.case.findMany({
      where,
      include: { client: { select: { id: true, name: true } } },
      orderBy: { escalatedAt: 'desc' },
      take: 500,
    });
    const total = await prisma.case.count({ where });
    return NextResponse.json({ data: cases, total });
  }

  const [
    caseCount,
    closedCases,
    userCount,
    invoiceAgg,
    tasksCount,
    recentCases,
    taskByStatus,
    timeEntriesAll,
    invoicesForAging,
    invoicesForCollection,
    closedCasesForDuration,
    leadCounts,
    usersForRevenue,
  ] = await Promise.all([
    prisma.case.count({ where: { deletedAt: null } }),
    prisma.case.count({ where: { deletedAt: null, status: 'closed' } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.invoice.aggregate({ where: { deletedAt: null }, _sum: { amount: true, paidAmount: true }, _count: true }),
    prisma.task.count({ where: { deletedAt: null } }),
    prisma.case.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: { client: { select: { id: true, name: true } } },
    }),
    prisma.task.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { id: true },
    }),
    prisma.timeEntry.findMany({
      where: { deletedAt: null, billable: true },
      select: { userId: true, caseId: true, hours: true, rate: true },
    }),
    prisma.invoice.findMany({
      where: { deletedAt: null, status: { notIn: ['void', 'draft'] } },
      select: { amount: true, paidAmount: true, dueDate: true, createdAt: true },
    }),
    prisma.invoice.findMany({
      where: { deletedAt: null, status: { notIn: ['draft', 'void'] } },
      select: { amount: true, paidAmount: true },
    }),
    prisma.case.findMany({
      where: { deletedAt: null, status: 'closed' },
      select: { id: true, createdAt: true, updatedAt: true },
    }),
    prisma.lead.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { id: true },
    }),
    prisma.user.findMany({
      where: { deletedAt: null, role: { not: 'client' } },
      select: { id: true, name: true },
    }),
  ]);

  const activeCases = caseCount - closedCases;
  const summary = {
    totalCases: caseCount,
    activeCases,
    closedCases,
    totalUsers: userCount,
    totalInvoices: invoiceAgg._count,
    totalRevenue: Number(invoiceAgg._sum.amount ?? 0),
    totalTasks: tasksCount,
  };
  const taskBreakdown = taskByStatus.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = row._count.id;
    return acc;
  }, {});

  // --- Finance: Revenue per lawyer (from time entries, billable hours * rate) ---
  const revenueByUser: Record<string, number> = {};
  const userMap = new Map(usersForRevenue.map((u) => [u.id, u.name ?? u.id]));
  for (const e of timeEntriesAll) {
    const amt = Number(e.hours) * (e.rate != null ? Number(e.rate) : 0);
    revenueByUser[e.userId] = (revenueByUser[e.userId] ?? 0) + amt;
  }
  const revenuePerLawyer = Object.entries(revenueByUser).map(([userId, revenue]) => ({
    userId,
    lawyerName: userMap.get(userId) ?? userId,
    revenue: Math.round(revenue * 100) / 100,
  })).sort((a, b) => b.revenue - a.revenue);

  // --- Finance: Revenue per case ---
  const revenueByCase: Record<string, number> = {};
  const caseIds = Array.from(new Set(timeEntriesAll.map((e) => e.caseId)));
  const casesForTitles = caseIds.length > 0
    ? await prisma.case.findMany({ where: { id: { in: caseIds } }, select: { id: true, title: true } })
    : [];
  const caseTitleMap = new Map(casesForTitles.map((c) => [c.id, c.title]));
  for (const e of timeEntriesAll) {
    const amt = Number(e.hours) * (e.rate != null ? Number(e.rate) : 0);
    revenueByCase[e.caseId] = (revenueByCase[e.caseId] ?? 0) + amt;
  }
  const revenuePerCase = Object.entries(revenueByCase).map(([caseId, revenue]) => ({
    caseId,
    caseTitle: caseTitleMap.get(caseId) ?? caseId,
    revenue: Math.round(revenue * 100) / 100,
  })).sort((a, b) => b.revenue - a.revenue);

  // --- Finance: Aging receivable (outstanding by age bucket) ---
  const now = new Date();
  const aging = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  for (const inv of invoicesForAging) {
    const outstanding = Number(inv.amount) - Number(inv.paidAmount);
    if (outstanding <= 0) continue;
    const due = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.createdAt);
    const daysOverdue = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    if (daysOverdue <= 30) aging['0-30'] += outstanding;
    else if (daysOverdue <= 60) aging['31-60'] += outstanding;
    else if (daysOverdue <= 90) aging['61-90'] += outstanding;
    else aging['90+'] += outstanding;
  }
  const agingReceivable = aging;

  // --- Finance: Collection rate ---
  let totalInvoiced = 0;
  let totalPaid = 0;
  for (const inv of invoicesForCollection) {
    totalInvoiced += Number(inv.amount);
    totalPaid += Number(inv.paidAmount);
  }
  const collectionRate = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 10000) / 100 : 0;

  // --- Operational: Utilization rate (billable hours / total hours per lawyer) ---
  const totalHoursByUser: Record<string, number> = {};
  const billableHoursByUser: Record<string, number> = {};
  const allTimeEntries = await prisma.timeEntry.findMany({
    where: { deletedAt: null },
    select: { userId: true, hours: true, billable: true },
  });
  for (const e of allTimeEntries) {
    const h = Number(e.hours);
    totalHoursByUser[e.userId] = (totalHoursByUser[e.userId] ?? 0) + h;
    if (e.billable) billableHoursByUser[e.userId] = (billableHoursByUser[e.userId] ?? 0) + h;
  }
  const utilizationPerLawyer = Object.entries(totalHoursByUser)
    .filter(([, total]) => total > 0)
    .map(([userId, total]) => {
      const billable = billableHoursByUser[userId] ?? 0;
      return {
        userId,
        lawyerName: userMap.get(userId) ?? userId,
        totalHours: Math.round(total * 100) / 100,
        billableHours: Math.round(billable * 100) / 100,
        utilizationRate: Math.round((billable / total) * 10000) / 100,
      };
    })
    .sort((a, b) => b.utilizationRate - a.utilizationRate);

  // --- Operational: Task completion rate ---
  const taskDone = taskByStatus.find((r) => r.status === 'done')?._count.id ?? 0;
  const taskCompletionRate = tasksCount > 0 ? Math.round((taskDone / tasksCount) * 10000) / 100 : 0;

  // --- Operational: Case duration average (closed cases, days) ---
  let caseDurationSumDays = 0;
  for (const c of closedCasesForDuration) {
    caseDurationSumDays += (c.updatedAt.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  }
  const caseDurationAverageDays = closedCasesForDuration.length > 0
    ? Math.round((caseDurationSumDays / closedCasesForDuration.length) * 10) / 10
    : 0;

  // --- Operational: Lead conversion % ---
  const totalLeads = leadCounts.reduce((s, r) => s + r._count.id, 0);
  const convertedLeads = leadCounts.find((r) => r.status === 'converted')?._count.id ?? 0;
  const leadConversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 10000) / 100 : 0;

  const finance = {
    revenuePerLawyer,
    revenuePerCase,
    agingReceivable,
    collectionRate,
    totalInvoiced,
    totalPaid,
  };
  const operational = {
    utilizationPerLawyer,
    taskCompletionRate,
    taskDone,
    taskTotal: tasksCount,
    caseDurationAverageDays,
    closedCasesCount: closedCasesForDuration.length,
    leadConversionRate,
    convertedLeads,
    totalLeads,
  };

  if (rest[0] === 'dashboard') {
    return NextResponse.json({
      summary,
      recentCases,
      taskBreakdown,
      finance,
      operational,
      data: [],
    });
  }
  return NextResponse.json({ summary, finance, operational, data: [] });
}

async function handleSettings(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  if (method === 'GET') {
    const list = await prisma.systemSetting.findMany({ take: 200, orderBy: { category: 'asc' } });
    return NextResponse.json({ data: list });
  }
  if (method === 'PUT' || method === 'PATCH') {
    try {
      const body = await request.json();
      const key = body.key ?? rest[0];
      if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });
      const existing = await prisma.systemSetting.findUnique({ where: { key } });
      const value = body.value !== undefined ? body.value : undefined;
      const category = body.category ?? existing?.category ?? 'general';
      const updated = existing
        ? await prisma.systemSetting.update({ where: { key }, data: { value, category, description: body.description ?? existing.description } })
        : await prisma.systemSetting.create({ data: { key, value, category, description: body.description ?? null } });
      return NextResponse.json(updated);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }
  return methodNotAllowed();
}

async function handleAudit(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  if (method !== 'GET') return methodNotAllowed();
  try {
    const { searchParams } = new URL(request.url);
    const userFilter = searchParams.get('user');
    const caseFilter = searchParams.get('case');
    const list = await prisma.auditLog.findMany({
      where: {
        ...(userFilter && { userId: userFilter }),
        ...(caseFilter && { entityId: caseFilter, entity: 'case' }),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return NextResponse.json({ data: list });
  } catch {
    return NextResponse.json({ data: [] });
  }
}

async function handleKnowledgeBase(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const CATEGORY = 'knowledge_base';
  if (method === 'GET') {
    const list = await prisma.systemSetting.findMany({ where: { category: CATEGORY }, orderBy: { key: 'asc' }, take: 200 });
    return NextResponse.json({ data: list });
  }
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    let body: { key?: string; value?: unknown; description?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const key = body.key ?? rest[0];
    if (!key || typeof key !== 'string') return NextResponse.json({ error: 'key required' }, { status: 400 });
    const row = await prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: body.value != null ? (body.value as Prisma.InputJsonValue) : Prisma.JsonNull, category: CATEGORY, description: body.description ?? null },
      update: { value: body.value !== undefined ? (body.value as Prisma.InputJsonValue) : undefined, description: body.description !== undefined ? body.description : undefined },
    });
    return NextResponse.json(row, { status: 201 });
  }
  if (method === 'DELETE') {
    const key = rest[0];
    if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });
    await prisma.systemSetting.deleteMany({ where: { key, category: CATEGORY } });
    return NextResponse.json({ message: 'OK' });
  }
  return methodNotAllowed();
}

async function handleNotificationRules(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const id = rest[0];
  if (id && method === 'GET') {
    const r = await prisma.notificationRule.findFirst({ where: { id } });
    return r ? NextResponse.json(r) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (method === 'GET') {
    const list = await prisma.notificationRule.findMany({ orderBy: { eventType: 'asc' }, take: 200 });
    return NextResponse.json({ data: list });
  }
  if (method === 'POST') {
    const body = await request.json().catch(() => ({}));
    if (!body.eventType || !body.channel || !body.targetType || !body.targetId)
      return NextResponse.json({ error: 'eventType, channel, targetType, targetId required' }, { status: 400 });
    const r = await prisma.notificationRule.create({
      data: {
        eventType: body.eventType,
        channel: body.channel,
        targetType: body.targetType,
        targetId: body.targetId,
        caseId: body.caseId ?? null,
        isActive: body.isActive !== false,
      },
    });
    return NextResponse.json(r, { status: 201 });
  }
  if (id && (method === 'PUT' || method === 'PATCH')) {
    const body = await request.json().catch(() => ({}));
    const r = await prisma.notificationRule.update({
      where: { id },
      data: {
        ...(body.eventType !== undefined && { eventType: body.eventType }),
        ...(body.channel !== undefined && { channel: body.channel }),
        ...(body.targetType !== undefined && { targetType: body.targetType }),
        ...(body.targetId !== undefined && { targetId: body.targetId }),
        ...(body.caseId !== undefined && { caseId: body.caseId ?? null }),
        ...(body.isActive !== undefined && { isActive: !!body.isActive }),
      },
    });
    return NextResponse.json(r);
  }
  if (id && method === 'DELETE') {
    await prisma.notificationRule.delete({ where: { id } }).catch(() => {});
    return NextResponse.json({ message: 'OK' });
  }
  return methodNotAllowed();
}

async function handleApprovalsAdmin(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  if (method === 'GET') {
    const list = await prisma.approvalRequest.findMany({
      orderBy: { requestedAt: 'desc' },
      take: 200,
      include: { case_: { select: { id: true, title: true } }, client: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ data: list });
  }
  if (method === 'POST') {
    const body = await request.json().catch(() => ({}));
    if (!body.caseId || !body.clientId || !body.type || !body.entityId)
      return NextResponse.json({ error: 'caseId, clientId, type, entityId required' }, { status: 400 });
    const ar = await prisma.approvalRequest.create({
      data: {
        caseId: body.caseId,
        clientId: body.clientId,
        type: body.type,
        entityId: body.entityId,
        requestedBy: body.requestedBy ?? null,
        status: 'pending',
      },
      include: { case_: { select: { id: true, title: true } }, client: { select: { id: true, name: true } } },
    });
    return NextResponse.json(ar, { status: 201 });
  }
  return methodNotAllowed();
}

async function handleFirms(rest: string[], method: string, request: NextRequest, auth: AuthUser): Promise<NextResponse> {
  if (!auth.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const id = rest[0];
  if (id) {
    if (method === 'GET') {
      const f = await prisma.firm.findFirst({ where: { id, deletedAt: null } });
      return f ? NextResponse.json(f) : NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (method === 'PUT' || method === 'PATCH') {
      const body = await request.json().catch(() => ({}));
      const name = (body.name as string)?.trim();
      const slug = (body.slug as string)?.trim();
      const data: { name?: string; slug?: string } = {};
      if (name) data.name = name;
      if (slug) data.slug = slug;
      const updated = await prisma.firm.update({ where: { id }, data });
      return NextResponse.json(updated);
    }
    if (method === 'DELETE') {
      await prisma.firm.update({ where: { id }, data: { deletedAt: new Date() } });
      return NextResponse.json({ message: 'OK' });
    }
    return methodNotAllowed();
  }
  if (method === 'GET') {
    const list = await prisma.firm.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } });
    return NextResponse.json({ data: list });
  }
  if (method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const name = (body.name as string)?.trim();
    const slug = (body.slug as string)?.trim().toLowerCase().replace(/\s+/g, '-') || name?.toLowerCase().replace(/\s+/g, '-');
    if (!name || !slug) return NextResponse.json({ error: 'name and slug required' }, { status: 400 });
    const created = await prisma.firm.create({ data: { name, slug } });
    return NextResponse.json(created, { status: 201 });
  }
  return methodNotAllowed();
}

async function handleFirmConfigs(rest: string[], method: string, request: NextRequest, auth: AuthUser): Promise<NextResponse> {
  const firmId = rest[0] || auth.firmId;
  if (!firmId) return NextResponse.json({ error: 'firmId required' }, { status: 400 });
  if (auth.firmId && auth.firmId !== firmId && !auth.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (method === 'GET') {
    const list = await prisma.firmConfig.findMany({ where: { firmId }, orderBy: { key: 'asc' } });
    return NextResponse.json({ data: list });
  }
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    const body = await request.json().catch(() => ({}));
    const key = (body.key as string)?.trim();
    const value = body.value;
    if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });
    const row = await prisma.firmConfig.upsert({
      where: { firmId_key: { firmId, key } },
      create: { firmId, key, value: value ?? null },
      update: { value: value ?? null },
    });
    return NextResponse.json(row);
  }
  return methodNotAllowed();
}

async function handleSessions(rest: string[], method: string, request: NextRequest, auth: AuthUser): Promise<NextResponse> {
  if (rest[0] === 'me' || (!rest[0] && method === 'GET')) {
    if (method !== 'GET') return methodNotAllowed();
    const list = await prisma.session.findMany({
      where: { userId: auth.userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, source: true, userAgent: true, deviceLabel: true, deviceId: true, ipAddress: true, lastActiveAt: true, createdAt: true, expiresAt: true },
    });
    return NextResponse.json({ data: list });
  }
  const sessionId = rest[0];
  if (sessionId && method === 'DELETE') {
    const session = await prisma.session.findFirst({ where: { id: sessionId, userId: auth.userId } });
    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await prisma.session.delete({ where: { id: sessionId } });
    return NextResponse.json({ message: 'Revoked' });
  }
  return methodNotAllowed();
}

/** Returns SLA due date from rule (created_at or stage_changed + dueDays) and reminder days, or null. */
async function getSlaDueFromRule(
  firmId: string | null,
  caseType: string | null,
  createdAt: Date,
  stageChangedAt?: Date | null,
  currentStage?: string | null
): Promise<{ slaDueDate: Date; reminderDaysBefore: number[] } | null> {
  if (!caseType?.trim()) return null;
  const rule = await prisma.slaRule.findFirst({
    where: { isActive: true, caseType: caseType.trim(), OR: [{ firmId: firmId ?? undefined }, { firmId: null }] },
    orderBy: { firmId: 'desc' },
  });
  if (!rule) return null;
  const dueFrom = (rule as { dueFrom?: string }).dueFrom ?? 'created_at';
  const triggerStage = (rule as { triggerStage?: string | null }).triggerStage ?? null;
  let base = new Date(createdAt);
  if (dueFrom === 'stage_changed' && triggerStage && (currentStage ?? '').trim() === triggerStage.trim() && stageChangedAt) {
    base = new Date(stageChangedAt);
  }
  const d = new Date(base);
  d.setDate(d.getDate() + rule.dueDays);
  const arr = rule.reminderDaysBefore as unknown;
  const reminderDays = Array.isArray(arr) ? arr.filter((x): x is number => typeof x === 'number') : [];
  return { slaDueDate: d, reminderDaysBefore: reminderDays };
}

async function handleSlaRules(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const auth = await getAuthFromRequest(request, 'admin');
  const firmId = auth?.firmId ?? null;
  if (method === 'GET' && rest.length === 0) {
    const list = await prisma.slaRule.findMany({
      where: { OR: [{ firmId: firmId ?? undefined }, { firmId: null }] },
      orderBy: [{ firmId: 'desc' }, { caseType: 'asc' }],
    });
    return NextResponse.json({ data: list });
  }
  const id = rest[0];
  if (id && rest.length === 1) {
    if (method === 'GET') {
      const r = await prisma.slaRule.findFirst({ where: { id } });
      if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(r);
    }
    if (method === 'PUT' || method === 'PATCH') {
      const body = await request.json().catch(() => ({}));
      const r = await prisma.slaRule.findFirst({ where: { id } });
      if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const data: { caseType?: string; dueDays?: number; reminderDaysBefore?: Prisma.InputJsonValue; escalationNotifyRole?: string | null; isActive?: boolean; dueFrom?: string; triggerStage?: string | null } = {};
      if (body.caseType !== undefined) data.caseType = String(body.caseType).trim();
      if (body.dueDays !== undefined) data.dueDays = Number(body.dueDays) || 0;
      if (body.reminderDaysBefore !== undefined) data.reminderDaysBefore = Array.isArray(body.reminderDaysBefore) ? body.reminderDaysBefore : (body.reminderDaysBefore != null ? [Number(body.reminderDaysBefore)] : []);
      if (body.escalationNotifyRole !== undefined) data.escalationNotifyRole = body.escalationNotifyRole?.trim() || null;
      if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
      if (body.dueFrom !== undefined) data.dueFrom = (body.dueFrom === 'stage_changed' ? 'stage_changed' : 'created_at') as string;
      if (body.triggerStage !== undefined) data.triggerStage = (body.triggerStage ?? body.trigger_stage)?.trim() || null;
      const updated = await prisma.slaRule.update({ where: { id }, data });
      return NextResponse.json(updated);
    }
    if (method === 'DELETE') {
      await prisma.slaRule.delete({ where: { id } }).catch(() => null);
      return NextResponse.json({ message: 'OK' });
    }
  }
  if (method === 'POST' && rest.length === 0) {
    const body = await request.json().catch(() => ({}));
    const caseType = (body.caseType ?? body.case_type) as string;
    const dueDays = Number(body.dueDays ?? body.due_days ?? 30);
    const reminderDaysBefore = Array.isArray(body.reminderDaysBefore ?? body.reminder_days_before)
      ? (body.reminderDaysBefore ?? body.reminder_days_before).map((d: unknown) => Number(d)).filter((d: number) => d > 0)
      : [7, 3, 1];
    const escalationNotifyRole = (body.escalationNotifyRole ?? body.escalation_notify_role) as string | undefined;
    const dueFrom = (body.dueFrom ?? body.due_from) === 'stage_changed' ? 'stage_changed' : 'created_at';
    const triggerStage = (body.triggerStage ?? body.trigger_stage)?.trim() || null;
    if (!caseType?.trim()) return NextResponse.json({ error: 'caseType required' }, { status: 400 });
    const created = await prisma.slaRule.create({
      data: {
        firmId,
        caseType: caseType.trim(),
        dueFrom,
        triggerStage,
        dueDays,
        reminderDaysBefore: reminderDaysBefore as Prisma.InputJsonValue,
        escalationNotifyRole: escalationNotifyRole?.trim() || null,
        isActive: body.isActive !== false,
      },
    });
    return NextResponse.json(created, { status: 201 });
  }
  return methodNotAllowed();
}

async function handleExport(rest: string[], method: string, request: NextRequest, auth: AuthUser): Promise<NextResponse> {
  const firmId = auth.firmId;
  if (!firmId) return NextResponse.json({ error: 'Firm context required' }, { status: 400 });
  if (method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const exportType = (body.exportType ?? body.export_type ?? 'full') as string;
    const entityId = body.entityId ?? body.entity_id ?? null;
    const job = await prisma.exportJob.create({
      data: { firmId, requestedBy: auth.userId, exportType, entityId, status: 'pending' },
    });
    return NextResponse.json(job, { status: 201 });
  }
  if (method === 'GET') {
    const list = await prisma.exportJob.findMany({
      where: { firmId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json({ data: list });
  }
  const id = rest[0];
  if (id && method === 'GET') {
    const job = await prisma.exportJob.findFirst({ where: { id, firmId } });
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(job);
  }
  return methodNotAllowed();
}

async function handleEscalations(rest: string[], method: string, request: NextRequest, auth: AuthUser): Promise<NextResponse> {
  const firmId = auth.firmId ?? null;
  const firmWhere = firmId ? { firmId } : {};

  // GET /escalations — list escalated (unresolved) cases
  if (method === 'GET' && rest.length === 0) {
    const url = new URL(request.url);
    const includeResolved = url.searchParams.get('includeResolved') === 'true';
    const cases = await prisma.case.findMany({
      where: {
        deletedAt: null,
        ...firmWhere,
        escalatedAt: { not: null },
        ...(includeResolved ? {} : { escalationResolvedAt: null }),
      },
      select: {
        id: true, title: true, caseNumber: true, caseType: true, status: true,
        slaDueDate: true, escalatedAt: true,
        escalationResolvedAt: true, escalationNote: true,
        client: { select: { name: true } },
        teamMembers: { select: { userId: true, role: true, user: { select: { name: true, email: true } } } },
      },
      orderBy: { escalatedAt: 'desc' },
    });
    const summary = {
      total: cases.length,
      unresolved: cases.filter((c) => !c.escalationResolvedAt).length,
      resolved: cases.filter((c) => !!c.escalationResolvedAt).length,
    };
    return NextResponse.json({ summary, data: cases });
  }

  const caseId = rest[0];

  // POST /escalations/{caseId}/resolve — mark escalation as resolved
  if (caseId && rest[1] === 'resolve' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : null;
    const c = await prisma.case.findFirst({ where: { id: caseId, deletedAt: null, escalatedAt: { not: null } } });
    if (!c) return NextResponse.json({ error: 'Escalated case not found' }, { status: 404 });
    if (c.escalationResolvedAt) return NextResponse.json({ error: 'Already resolved' }, { status: 400 });
    const updated = await prisma.case.update({
      where: { id: caseId },
      data: { escalationResolvedAt: new Date(), escalationNote: note },
    });
    return NextResponse.json(updated);
  }

  return methodNotAllowed();
}

function methodNotAllowed() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
