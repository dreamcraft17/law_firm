/**
 * Handler untuk /api/mobile/* — dipakai app Flutter (law_firm).
 * Path: mobile/auth/login, mobile/cases, mobile/tasks, dll.
 * R0: Login return roleId + permissions; R0.2: Row-level case access (team/client).
 */
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, createSession } from '@/lib/auth-helper';
import { normalizeCaseForResponse, normalizeCaseListForResponse } from './case-response';

export async function handleMobile(
  pathSegments: string[],
  method: string,
  request: NextRequest
): Promise<NextResponse> {
  const [group, ...rest] = pathSegments;

  try {
    switch (group) {
      case 'auth':
        return handleAuth(rest, method, request);
      case 'clients':
        return handleMobileClients(rest, method);
      case 'leads':
        return handleMobileLeads(rest, method, request);
      case 'cases':
        return handleCases(rest, method, request);
      case 'tasks':
        return handleTasks(rest, method, request);
      case 'documents':
        return handleDocuments(rest, method, request);
      case 'time-entries':
        return handleMobileTimeEntries(rest, method, request);
      case 'expenses':
        return handleMobileExpenses(rest, method, request);
      case 'events':
        return handleEvents(rest, method, request);
      case 'invoices':
        return handleInvoices(rest, method, request);
      case 'dashboard':
        return handleDashboard(rest, method, request);
      case 'notifications':
        return handleNotifications(rest, method, request);
      case 'messages':
        return handleMessages(rest, method, request);
      case 'approvals':
        return handleApprovals(rest, method, request);
      case 'activity':
        return handleActivity(rest, method, request);
      case 'trust-accounts':
        return handleTrustAccountsMobile(rest, method, request);
      case 'recurring-task-templates':
        return handleRecurringTaskTemplatesMobile(rest, method, request);
      case 'search':
        return handleSearch(rest, method, request);
      case 'saved-views':
        return handleSavedViews(rest, method, request);
      default:
        return NextResponse.json(
          { error: 'Not found', path: pathSegments.join('/') },
          { status: 404 }
        );
    }
  } catch (e) {
    console.error('mobile API error', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 }
    );
  }
}

async function handleAuth(
  rest: string[],
  method: string,
  request: NextRequest
): Promise<NextResponse> {
  const [action] = rest;
  if (action === 'login' && method === 'POST') {
    let body: { email?: string; password?: string } = {};
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
    });
    if (!user) {
      return NextResponse.json({ error: 'Kredensial tidak valid' }, { status: 401 });
    }
    if (!user.passwordHash) {
      return NextResponse.json({ error: 'Kredensial tidak valid' }, { status: 401 });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      await prisma.auditLog.create({ data: { userId: user.id, action: 'login_failed', entity: 'user', entityId: user.id, details: { email: user.email, reason: 'invalid_password' } } }).catch(() => {});
      return NextResponse.json({ error: 'Kredensial tidak valid' }, { status: 401 });
    }
    await prisma.auditLog.create({ data: { userId: user.id, action: 'login', entity: 'user', entityId: user.id, details: { email: user.email } } }).catch(() => {});
    const refreshToken = `mobile_refresh_${crypto.randomBytes(24).toString('hex')}`;
    const token = await createSession(user.id, 'mobile', refreshToken);
    const userWithRole = await prisma.user.findFirst({
      where: { id: user.id },
      include: { roleRef: { include: { permissions: { include: { permission: true } } } } },
    });
    const permissions = userWithRole?.roleRef?.permissions?.map((rp) => rp.permission.key) ?? [];
    const userPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      roleId: user.roleId ?? null,
      clientId: user.clientId ?? null,
      phone: null as string | null,
    };
    return NextResponse.json({
      access_token: token,
      refresh_token: refreshToken,
      user: userPayload,
      roleId: user.roleId ?? null,
      permissions,
    });
  }
  if (action === 'logout' && method === 'POST') {
    return NextResponse.json({ message: 'OK' });
  }
  if (action === 'refresh' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const refresh = body.refresh_token;
    if (!refresh) return NextResponse.json({ error: 'refresh_token required' }, { status: 400 });
    const session = await prisma.session.findFirst({
      where: { refreshToken: refresh, source: 'mobile' },
      include: { user: { select: { id: true } } },
    });
    if (!session) return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
    const newToken = `mobile_${crypto.randomBytes(24).toString('hex')}`;
    const newRefresh = `mobile_refresh_${crypto.randomBytes(24).toString('hex')}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    await prisma.session.create({
      data: { userId: session.userId, token: newToken, refreshToken: newRefresh, source: 'mobile', expiresAt },
    });
    return NextResponse.json({
      access_token: newToken,
      refresh_token: newRefresh,
    });
  }
  if (action === 'otp/send' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const email = body.email ?? body.phone;
    if (!email) return NextResponse.json({ error: 'email or phone required' }, { status: 400 });
    return NextResponse.json({ message: 'OTP sent', sentTo: email });
  }
  if (action === 'otp/verify' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    if (!body.otp) return NextResponse.json({ error: 'otp required' }, { status: 400 });
    const user = await prisma.user.findFirst({ where: { deletedAt: null }, take: 1 });
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 });
    const token = `mobile_${crypto.randomBytes(24).toString('hex')}`;
    return NextResponse.json({
      access_token: token,
      refresh_token: `mobile_refresh_${crypto.randomBytes(24).toString('hex')}`,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: null },
    });
  }
  if (rest[0] === 'reset-password' && rest[1] === 'confirm' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const email = body.email?.trim()?.toLowerCase();
    const token = body.token;
    const newPassword = body.newPassword ?? body.new_password;
    if (!email || !token || !newPassword) return NextResponse.json({ error: 'email, token, dan newPassword wajib' }, { status: 400 });
    const key = `reset_token:${email}`;
    const row = await prisma.systemSetting.findUnique({ where: { key } });
    if (!row || !row.value || typeof row.value !== 'object') return NextResponse.json({ error: 'Token tidak valid atau kedaluwarsa' }, { status: 400 });
    const v = row.value as { token?: string; expiresAt?: string };
    if (v.token !== token) return NextResponse.json({ error: 'Token tidak valid' }, { status: 400 });
    if (new Date(v.expiresAt ?? 0) < new Date()) {
      await prisma.systemSetting.deleteMany({ where: { key } });
      return NextResponse.json({ error: 'Token kedaluwarsa' }, { status: 400 });
    }
    const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });
    if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await prisma.systemSetting.deleteMany({ where: { key } });
    return NextResponse.json({ message: 'Password berhasil diubah' });
  }
  if (action === 'reset-password' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const email = body.email?.trim()?.toLowerCase();
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
    const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });
    if (user) {
      const token = crypto.randomBytes(24).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const key = `reset_token:${email}`;
      await prisma.systemSetting.upsert({
        where: { key },
        create: { key, value: { token, expiresAt }, category: 'auth', description: 'Password reset token' },
        update: { value: { token, expiresAt } },
      });
    }
    return NextResponse.json({ message: 'Jika email terdaftar, instruksi reset password akan dikirim.' });
  }
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

// --- M1: Clients (read-only for mobile) ---
async function handleMobileClients(rest: string[], method: string): Promise<NextResponse> {
  if (method !== 'GET') return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  const id = rest[0];
  if (id) {
    const c = await prisma.client.findFirst({
      where: { id, deletedAt: null, status: 'active' },
      include: { contacts: { where: { deletedAt: null } } },
    });
    return c ? NextResponse.json(c) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const list = await prisma.client.findMany({
    where: { deletedAt: null, status: 'active' },
    orderBy: { name: 'asc' },
    take: 200,
  });
  return NextResponse.json({ data: list });
}

// --- M4: Leads (mobile: list, get, create intake, consultation) ---
async function handleMobileLeads(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const auth = await getAuthFromRequest(request, 'mobile');
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = rest[0];
  if (id) {
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
            data: { name: lead.name, type: 'individual', status: 'active' },
          });
          clientId = client.id;
        }
        const caseTitle = (body.title as string)?.trim() || `${lead.serviceCategory || 'Matter'} - ${lead.name}`;
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
        const defaultTasks = ['Review dokumen intake', 'Jadwalkan konsultasi', 'Konfirmasi engagement'];
        for (const title of defaultTasks) {
          await prisma.task.create({ data: { title, status: 'pending', caseId: newCase.id } });
        }
        await prisma.lead.update({
          where: { id },
          data: { clientId, caseId: newCase.id, status: 'converted' },
        });
        const checklistKeys = ['initial_doc', 'kyc', 'retainer'];
        for (const key of checklistKeys) {
          const exists = await prisma.leadIntakeChecklist.findFirst({ where: { leadId: id, itemKey: key } });
          if (!exists) {
            await prisma.leadIntakeChecklist.create({
              data: { leadId: id, caseId: newCase.id, itemKey: key, status: 'pending' },
            });
          }
        }
        const updatedLead = await prisma.lead.findFirst({ where: { id }, include: { client: true, case: true } });
        return NextResponse.json({
          lead: updatedLead,
          case: { id: newCase.id, title: newCase.title, client_name: newCase.client?.name, status: newCase.status, stage: newCase.stage },
        }, { status: 201 });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Convert failed' }, { status: 400 });
      }
    }
    if (rest[1] === 'consultation' && method === 'POST') {
      const lead = await prisma.lead.findFirst({ where: { id, deletedAt: null }, include: { events: { where: { deletedAt: null }, orderBy: { startAt: 'desc' }, take: 1 } } });
      if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      try {
        const body = await request.json().catch(() => ({}));
        const startAt = body.startAt ?? body.start_at;
        const endAt = body.endAt ?? body.end_at;
        const title = (body.title as string)?.trim() || `Konsultasi: ${lead.name}`;
        const existingEvent = lead.events[0];
        if (existingEvent && (body.action === 'confirm' || body.action === 'reschedule')) {
          const updated = await prisma.event.update({
            where: { id: existingEvent.id },
            data: {
              ...(startAt && { startAt: new Date(startAt) }),
              ...(endAt && { endAt: new Date(endAt) }),
              title,
            },
          });
          return NextResponse.json(updated);
        }
        if (!startAt) return NextResponse.json({ error: 'startAt required' }, { status: 400 });
        const event = await prisma.event.create({
          data: {
            title,
            type: 'consultation',
            leadId: id,
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
      const lead = await prisma.lead.findFirst({ where: { id, deletedAt: null } });
      if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const body = await request.json().catch(() => ({}));
      const data: { name?: string; email?: string | null; phone?: string | null; source?: string | null; serviceCategory?: string | null; problemSummary?: string | null; status?: string } = {};
      if (body.name !== undefined) data.name = body.name?.trim() ?? lead.name;
      if (body.email !== undefined) data.email = body.email?.trim() || null;
      if (body.phone !== undefined) data.phone = body.phone?.trim() || null;
      if (body.source !== undefined) data.source = body.source?.trim() || null;
      if (body.serviceCategory !== undefined || body.service_category !== undefined) data.serviceCategory = (body.serviceCategory ?? body.service_category)?.trim() || null;
      if (body.problemSummary !== undefined || body.problem_summary !== undefined) data.problemSummary = (body.problemSummary ?? body.problem_summary)?.trim() || null;
      if (body.status !== undefined) data.status = body.status;
      const updated = await prisma.lead.update({ where: { id }, data, include: { client: true, case: true } });
      return NextResponse.json(updated);
    }
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }
  if (method === 'GET') {
    const list = await prisma.lead.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 200,
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
          status: 'new',
        },
        include: { client: true, case: true },
      });
      return NextResponse.json(lead, { status: 201 });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

// --- M2: Time entries (mobile: list by case, create) ---
async function handleMobileTimeEntries(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  if (rest[0] === 'case' && rest[1] && method === 'GET') {
    const list = await prisma.timeEntry.findMany({
      where: { caseId: rest[1], deletedAt: null },
      orderBy: { workDate: 'desc' },
      include: { user: { select: { id: true, name: true } } },
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
      });
      return NextResponse.json(e, { status: 201 });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

// --- M3: Expenses (mobile: list by case, create) ---
async function handleMobileExpenses(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
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
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

function caseAccessWhere(auth: { userId: string; clientId: string | null; isAdmin: boolean }): Record<string, unknown> {
  if (auth.isAdmin) return {};
  if (auth.clientId) return { clientId: auth.clientId };
  return { teamMembers: { some: { userId: auth.userId } } };
}

async function canAccessCase(caseId: string, auth: { userId: string; clientId: string | null; isAdmin: boolean }): Promise<boolean> {
  if (auth.isAdmin) return true;
  const c = await prisma.case.findFirst({
    where: { id: caseId, deletedAt: null },
    select: { clientId: true, id: true },
  });
  if (!c) return false;
  if (auth.clientId && c.clientId === auth.clientId) return true;
  const inTeam = await prisma.caseTeamMember.findFirst({ where: { caseId, userId: auth.userId } });
  return !!inTeam;
}

async function handleTrustAccountsMobile(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const auth = await getAuthFromRequest(request, 'mobile');
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (method !== 'GET') return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  const clientId = auth.clientId || rest[0] || new URL(request.url).searchParams.get('clientId');
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 });
  if (auth.clientId && auth.clientId !== clientId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  let account = await prisma.clientTrustAccount.findUnique({ where: { clientId }, include: { transactions: { orderBy: { createdAt: 'desc' }, take: 30 } } });
  if (!account) account = await prisma.clientTrustAccount.create({ data: { clientId, balance: 0, currency: 'IDR' }, include: { transactions: true } });
  return NextResponse.json(account);
}

async function handleRecurringTaskTemplatesMobile(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const auth = await getAuthFromRequest(request, 'mobile');
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (method !== 'GET') return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  const { searchParams } = new URL(request.url);
  const caseId = searchParams.get('caseId');
  const where: Prisma.RecurringTaskTemplateWhereInput = { deletedAt: null, isActive: true };
  if (caseId) {
    if (!(await canAccessCase(caseId, auth))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    where.caseId = caseId;
  } else {
    const caseIds = await prisma.case.findMany({ where: { deletedAt: null, ...caseAccessWhere(auth) }, select: { id: true } }).then((r) => r.map((c) => c.id));
    where.OR = [{ caseId: null }, { caseId: { in: caseIds } }];
  }
  const list = await prisma.recurringTaskTemplate.findMany({ where, orderBy: { nextRunAt: 'asc' }, take: 100 });
  return NextResponse.json({ data: list });
}

async function handleSearch(_rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  if (method !== 'GET') return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  const auth = await getAuthFromRequest(request, 'mobile');
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const typesParam = searchParams.get('types');
  const types = typesParam ? typesParam.split(',').map((t) => t.trim()).filter(Boolean) : ['case', 'document', 'task'];
  const take = Math.min(Number(searchParams.get('limit')) || 15, 30);
  const caseWhere = caseAccessWhere(auth);
  const isClient = !!auth.clientId;

  const results: { cases: unknown[]; documents: unknown[]; tasks: unknown[] } = { cases: [], documents: [], tasks: [] };

  if (!q) return NextResponse.json({ data: results });

  if (types.includes('case')) {
    const cases = await prisma.case.findMany({
      where: {
        deletedAt: null,
        ...caseWhere,
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
  if (types.includes('document')) {
    const docWhere: Prisma.DocumentWhereInput = {
      deletedAt: null,
      name: { contains: q, mode: 'insensitive' },
      ...(isClient ? { clientVisible: true } : {}),
      ...(Object.keys(caseWhere).length ? { case: { deletedAt: null, ...caseWhere } } : {}),
    };
    const documents = await prisma.document.findMany({
      where: docWhere,
      take,
      orderBy: { updatedAt: 'desc' },
      include: { case: { select: { id: true, title: true, caseNumber: true } } },
    });
    results.documents = documents;
  }
  if (types.includes('task')) {
    const taskWhere: Prisma.TaskWhereInput = {
      deletedAt: null,
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    };
    if (Object.keys(caseWhere).length) {
      taskWhere.case = { deletedAt: null, ...caseWhere };
    }
    const tasks = await prisma.task.findMany({
      where: taskWhere,
      take,
      orderBy: { updatedAt: 'desc' },
      include: { case: { select: { id: true, title: true } } },
    });
    results.tasks = tasks;
  }
  return NextResponse.json({ data: results });
}

async function handleSavedViews(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const auth = await getAuthFromRequest(request, 'mobile');
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
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

async function handleCases(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const auth = await getAuthFromRequest(request, 'mobile');
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = rest[0];
  const baseWhere = { deletedAt: null, ...caseAccessWhere(auth) };

  // Handle /cases endpoint (no ID)
  if (!id) {
    if (method === 'GET') {
      try {
        const list = await prisma.case.findMany({
          where: baseWhere,
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: { client: true },
        });
        return NextResponse.json({ data: normalizeCaseListForResponse(list) });
      } catch (error) {
        console.error('Error fetching cases:', error);
        return NextResponse.json(
          { error: 'Database error' },
          { status: 500 }
        );
      }
    }
    
    if (method === 'POST') {
      // CREATE new case
      try {
        const body = await request.json();
        
        // Validate required fields
        if (!body.title) {
          return NextResponse.json(
            { error: 'Title is required' },
            { status: 400 }
          );
        }

        // Handle client lookup/creation by name (master Client)
        let clientId = body.clientId;
        if (body.client_name && !clientId) {
          let client = await prisma.client.findFirst({
            where: { name: body.client_name, deletedAt: null },
          });
          if (!client) {
            client = await prisma.client.create({
              data: { name: body.client_name, type: 'individual', status: 'active' },
            });
          }
          clientId = client.id;
        }

        // Create the case
        const newCase = await prisma.case.create({
          data: {
            title: body.title,
            caseNumber: body.caseNumber || body.case_number || null,
            description: body.description || null,
            clientId: clientId,
            status: body.status || 'pending',
          },
          include: { client: true },
        });

        return NextResponse.json(normalizeCaseForResponse(newCase), { status: 201 });
      } catch (error) {
        console.error('Error creating case:', error);
        return NextResponse.json(
          { error: 'Failed to create case' },
          { status: 500 }
        );
      }
    }
    
    return methodNotAllowed(); // For other methods like PUT, DELETE at /cases
  }
  
  // Handle /cases/new special endpoint
  if (id === 'new') {
    if (method === 'GET') {
      // Return template for new case
      return NextResponse.json({
        title: '',
        caseNumber: '',
        description: '',
        clientId: null,
        status: 'pending'
      });
    }
    return methodNotAllowed();
  }
  
  // Handle /cases/{id}/milestones
  if (id && rest[1] === 'milestones') {
    const allowed = await canAccessCase(id, auth);
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (method === 'GET') {
      const list = await prisma.caseMilestone.findMany({ where: { caseId: id }, orderBy: [{ sortOrder: 'asc' }, { dueDate: 'asc' }] });
      return NextResponse.json({ data: list });
    }
    if (method === 'POST') {
      try {
        const body = await request.json().catch(() => ({}));
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
    return methodNotAllowed();
  }
  // Handle /cases/{id} with specific ID (timeline, team)
  if (id && rest[1]) {
    const sub = rest[1];
    if (sub === 'timeline' || sub === 'team') {
      const data = await prisma.case.findUnique({ where: { id } });
      return NextResponse.json(
        data ? { data: [] } : { error: 'Not found' },
        { status: data ? 200 : 404 }
      );
    }
  }
  
  // Handle /cases/{id} - GET specific case (R0.2: 403 if not team/client/admin)
  if (id) {
    if (method === 'GET') {
      try {
        const allowed = await canAccessCase(id, auth);
        if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        const c = await prisma.case.findFirst({
          where: { id, deletedAt: null },
          include: { client: true },
        });
        if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(normalizeCaseForResponse(c));
      } catch (error) {
        console.error('Error fetching case:', error);
        return NextResponse.json(
          { error: 'Database error' },
          { status: 500 }
        );
      }
    }

    if (method === 'PUT' || method === 'PATCH') {
      try {
        const body = await request.json();
        let clientId: string | null | undefined = body.clientId;
        if (body.client_name && clientId == null) {
          let client = await prisma.client.findFirst({ where: { name: body.client_name, deletedAt: null } });
          if (!client) {
            client = await prisma.client.create({
              data: { name: body.client_name, type: 'individual', status: 'active' },
            });
          }
          clientId = client.id;
        }
        const updateData: { title?: string; caseNumber?: string | null; description?: string | null; status?: string; clientId?: string | null } = {};
        if (body.title !== undefined) updateData.title = body.title;
        if (body.caseNumber !== undefined || body.case_number !== undefined) updateData.caseNumber = body.caseNumber ?? body.case_number ?? null;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.status !== undefined) updateData.status = body.status;
        if (clientId !== undefined) updateData.clientId = clientId;
        const updatedCase = await prisma.case.update({
          where: { id },
          data: updateData,
          include: { client: true },
        });
        return NextResponse.json(normalizeCaseForResponse(updatedCase));
      } catch (error) {
        console.error('Error updating case:', error);
        return NextResponse.json(
          { error: 'Failed to update case' },
          { status: 500 }
        );
      }
    }
    
    // Handle DELETE at /cases/{id}
    if (method === 'DELETE') {
      try {
        await prisma.case.update({
          where: { id },
          data: { deletedAt: new Date() }
        });
        return NextResponse.json({ message: 'Case deleted' });
      } catch (error) {
        console.error('Error deleting case:', error);
        return NextResponse.json(
          { error: 'Failed to delete case' },
          { status: 500 }
        );
      }
    }
    
    return methodNotAllowed();
  }
  
  return methodNotAllowed();
}

async function handleTasks(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const auth = await getAuthFromRequest(request, 'mobile');
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const caseWhere = caseAccessWhere(auth);

  const id = rest[0];
  if (id) {
    if (rest[1] === 'dependencies' && method === 'GET') {
      const t = await prisma.task.findFirst({ where: { id, deletedAt: null } });
      if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (t.caseId && !(await canAccessCase(t.caseId, auth))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const deps = await prisma.taskDependency.findMany({
        where: { taskId: id },
        include: { dependsOnTask: { select: { id: true, title: true, status: true, dueDate: true } } },
      });
      return NextResponse.json({ data: deps });
    }
    if (rest[1] === 'dependencies' && method === 'POST') {
      try {
        const t = await prisma.task.findFirst({ where: { id, deletedAt: null } });
        if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        if (t.caseId && !(await canAccessCase(t.caseId, auth))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        const body = await request.json().catch(() => ({}));
        const dependsOnTaskId = body.dependsOnTaskId ?? body.depends_on_task_id;
        if (!dependsOnTaskId) return NextResponse.json({ error: 'dependsOnTaskId required' }, { status: 400 });
        const dep = await prisma.taskDependency.create({
          data: { taskId: id, dependsOnTaskId },
          include: { dependsOnTask: { select: { id: true, title: true, status: true } } },
        });
        return NextResponse.json(dep, { status: 201 });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
      }
    }
    if (method === 'GET') {
      const t = await prisma.task.findFirst({
        where: { id, deletedAt: null },
        include: { case: true, dependsOn: { include: { dependsOnTask: { select: { id: true, title: true, status: true } } } } },
      });
      if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (t.caseId && !(await canAccessCase(t.caseId, auth))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const { case: _c, ...task } = t;
      return NextResponse.json(task);
    }
    if (rest[1] === 'status' && method === 'PATCH') {
      try {
        const t = await prisma.task.findFirst({ where: { id, deletedAt: null } });
        if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        if (t.caseId && !(await canAccessCase(t.caseId, auth))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        const body = await request.json().catch(() => ({}));
        const status = body.status ?? 'pending';
        const updated = await prisma.task.update({ where: { id }, data: { status: String(status) } });
        return NextResponse.json(updated);
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 });
      }
    }
    return methodNotAllowed();
  }
  if (method === 'GET') {
    const list = await prisma.task.findMany({
      where: {
        deletedAt: null,
        ...(Object.keys(caseWhere).length ? { case: { deletedAt: null, ...caseWhere } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json({ data: list });
  }
  return methodNotAllowed();
}

async function handleDocuments(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const auth = await getAuthFromRequest(request, 'mobile');
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const caseWhere = caseAccessWhere(auth);

  const isClient = !!auth.clientId;
  if (rest[0] === 'case' && rest[1]) {
    const caseId = rest[1];
    if (!(await canAccessCase(caseId, auth))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const list = await prisma.document.findMany({
      where: {
        caseId,
        deletedAt: null,
        ...(isClient ? { clientVisible: true } : {}),
      },
      include: { checkedOutByUser: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ data: list });
  }
  const id = rest[0];
  if (id && id !== 'case') {
    if (rest[1] === 'check-out' && method === 'POST') {
      const d = await prisma.document.findFirst({ where: { id, deletedAt: null } });
      if (!d) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (d.caseId && !(await canAccessCase(d.caseId, auth))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (isClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (d.checkedOutById) return NextResponse.json({ error: 'Document already checked out' }, { status: 400 });
      const updated = await prisma.document.update({
        where: { id },
        data: { checkedOutById: auth.userId, checkedOutAt: new Date() },
        include: { checkedOutByUser: { select: { id: true, name: true, email: true } } },
      });
      await prisma.documentAuditLog.create({ data: { documentId: id, userId: auth.userId, action: 'check_out' } }).catch(() => {});
      return NextResponse.json(updated);
    }
    if (rest[1] === 'check-in' && method === 'POST') {
      const d = await prisma.document.findFirst({ where: { id, deletedAt: null } });
      if (!d) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (d.caseId && !(await canAccessCase(d.caseId, auth))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (isClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const updated = await prisma.document.update({
        where: { id },
        data: { checkedOutById: null, checkedOutAt: null, version: d.version + 1 },
      });
      await prisma.documentAuditLog.create({ data: { documentId: id, userId: auth.userId, action: 'check_in' } }).catch(() => {});
      return NextResponse.json(updated);
    }
    if (rest[1] === 'audit-log' && method === 'GET') {
      const d = await prisma.document.findFirst({ where: { id, deletedAt: null } });
      if (!d) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (d.caseId && !(await canAccessCase(d.caseId, auth))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const logs = await prisma.documentAuditLog.findMany({ where: { documentId: id }, orderBy: { createdAt: 'desc' }, take: 100 });
      return NextResponse.json({ data: logs });
    }
    if (method === 'GET') {
      const d = await prisma.document.findFirst({
        where: { id, deletedAt: null },
        include: { checkedOutByUser: { select: { id: true, name: true, email: true } }, case: { select: { id: true, title: true, caseNumber: true } } },
      });
      if (!d) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (d.caseId && !(await canAccessCase(d.caseId, auth))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (isClient && !d.clientVisible) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      await prisma.documentAuditLog.create({ data: { documentId: id, userId: auth.userId, action: 'view' } }).catch(() => {});
      return NextResponse.json(d);
    }
  }
  if (method === 'GET') {
    const list = await prisma.document.findMany({
      where: {
        deletedAt: null,
        ...(isClient ? { clientVisible: true } : {}),
        ...(Object.keys(caseWhere).length ? { case: { deletedAt: null, ...caseWhere } } : {}),
      },
      take: 100,
      include: { case: { select: { id: true, title: true, caseNumber: true } }, checkedOutByUser: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ data: list });
  }
  return methodNotAllowed();
}

async function handleEvents(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const auth = await getAuthFromRequest(request, 'mobile');
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = rest[0];
  if (id && method === 'GET') {
    const e = await prisma.event.findFirst({
      where: { id, deletedAt: null },
      include: { case_: { select: { id: true, title: true, caseNumber: true } }, task: { select: { id: true, title: true } }, attendees: true },
    });
    if (!e) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (e.caseId && !(await canAccessCase(e.caseId, auth))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json(e);
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
    if (caseId) {
      if (!(await canAccessCase(caseId, auth))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      where.caseId = caseId;
    }
    if (taskId) where.taskId = taskId;
    const list = await prisma.event.findMany({
      where,
      orderBy: { startAt: 'asc' },
      take: 200,
      include: { case_: { select: { id: true, title: true } }, task: { select: { id: true, title: true } } },
    });
    return NextResponse.json({ data: list });
  }
  if (method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      if (!body.title || !body.startAt) return NextResponse.json({ error: 'title and startAt required' }, { status: 400 });
      if (body.caseId && !(await canAccessCase(body.caseId, auth))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

async function handleInvoices(rest: string[], method: string, _request: NextRequest): Promise<NextResponse> {
  const id = rest[0];
  if (id) {
    if (method === 'GET') {
      const i = await prisma.invoice.findFirst({ where: { id, deletedAt: null } });
      return i ? NextResponse.json(i) : NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (rest[1] === 'pay' && method === 'POST') {
      const inv = await prisma.invoice.findFirst({ where: { id, deletedAt: null } });
      if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const updated = await prisma.invoice.update({ where: { id }, data: { status: 'paid' } });
      return NextResponse.json(updated);
    }
    return methodNotAllowed();
  }
  if (method === 'GET') {
    const list = await prisma.invoice.findMany({
      where: { deletedAt: null },
      take: 100,
    });
    return NextResponse.json({ data: list });
  }
  return methodNotAllowed();
}

async function handleDashboard(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  if (method !== 'GET') return methodNotAllowed();
  const auth = await getAuthFromRequest(request, 'mobile');
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (auth.clientId) {
    const [caseCount, invCount, cases] = await Promise.all([
      prisma.case.count({ where: { clientId: auth.clientId, deletedAt: null } }),
      prisma.invoice.count({ where: { clientId: auth.clientId, deletedAt: null } }),
      prisma.case.findMany({ where: { clientId: auth.clientId, deletedAt: null }, orderBy: { updatedAt: 'desc' }, take: 10 }),
    ]);
    return NextResponse.json({
      summary: { totalCases: caseCount, totalInvoices: invCount },
      activity: cases.map((a) => ({ id: a.id, title: a.title, updatedAt: a.updatedAt, stage: a.stage })),
    });
  }
  const [summary, activity] = await Promise.all([
    prisma.case.count({ where: { deletedAt: null } }),
    prisma.case.findMany({ where: { deletedAt: null }, orderBy: { updatedAt: 'desc' }, take: 10 }),
  ]);
  return NextResponse.json({
    summary: { totalCases: summary },
    activity: activity.map((a) => ({ id: a.id, title: a.title, updatedAt: a.updatedAt })),
  });
}

async function handleNotifications(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const auth = await getAuthFromRequest(request, 'mobile');
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (rest[0] === 'preferences') {
    if (method === 'GET') {
      const prefs = await prisma.userNotificationPref.findUnique({ where: { userId: auth.userId } });
      return NextResponse.json(prefs ?? { muteCaseIds: [], quietHoursStart: null, quietHoursEnd: null, dailyDigest: false });
    }
    if (method === 'PATCH' || method === 'PUT') {
      const body = await request.json().catch(() => ({}));
      const muteCaseIds = Array.isArray(body.muteCaseIds) ? (body.muteCaseIds as Prisma.InputJsonValue) : Prisma.JsonNull;
      const prefs = await prisma.userNotificationPref.upsert({
        where: { userId: auth.userId },
        create: {
          userId: auth.userId,
          muteCaseIds,
          quietHoursStart: (body.quietHoursStart as string) || null,
          quietHoursEnd: (body.quietHoursEnd as string) || null,
          dailyDigest: !!body.dailyDigest,
        },
        update: {
          ...(body.muteCaseIds !== undefined && { muteCaseIds }),
          ...(body.quietHoursStart !== undefined && { quietHoursStart: (body.quietHoursStart as string) || null }),
          ...(body.quietHoursEnd !== undefined && { quietHoursEnd: (body.quietHoursEnd as string) || null }),
          ...(body.dailyDigest !== undefined && { dailyDigest: !!body.dailyDigest }),
        },
      });
      return NextResponse.json(prefs);
    }
    return methodNotAllowed();
  }
  const id = rest[0];
  if (id && rest[1] === 'read' && method === 'POST') {
    const n = await prisma.notification.findFirst({ where: { id, userId: auth.userId } });
    if (!n) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
    return NextResponse.json({ message: 'OK' });
  }
  if (method === 'GET') {
    const list = await prisma.notification.findMany({
      where: { userId: auth.userId },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ data: list });
  }
  return methodNotAllowed();
}

async function handleMessages(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const auth = await getAuthFromRequest(request, 'mobile');
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (rest[0] === 'case' && rest[1]) {
    const caseId = rest[1];
    if (!(await canAccessCase(caseId, auth))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (method === 'GET') {
      const list = await prisma.caseMessage.findMany({
        where: { caseId },
        orderBy: { createdAt: 'asc' },
        take: 200,
        include: { sender: { select: { id: true, name: true, email: true } } },
      });
      return NextResponse.json({ data: list });
    }
    if (method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const bodyText = (body.body as string)?.trim() ?? '';
      const attachmentUrl = (body.attachmentUrl as string)?.trim() || null;
      if (!bodyText) return NextResponse.json({ error: 'body required' }, { status: 400 });
      const msg = await prisma.caseMessage.create({
        data: { caseId, senderId: auth.userId, body: bodyText, attachmentUrl },
        include: { sender: { select: { id: true, name: true, email: true } } },
      });
      return NextResponse.json(msg, { status: 201 });
    }
    return methodNotAllowed();
  }
  if (method === 'GET') return NextResponse.json({ data: [] });
  return methodNotAllowed();
}

async function handleApprovals(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const auth = await getAuthFromRequest(request, 'mobile');
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = rest[0];
  if (id && rest[1] === 'respond' && method === 'POST') {
    const ar = await prisma.approvalRequest.findFirst({ where: { id }, include: { case_: true, client: true } });
    if (!ar) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (auth.clientId && ar.clientId !== auth.clientId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (ar.status !== 'pending') return NextResponse.json({ error: 'Already responded' }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    const status = (body.status as string) === 'rejected' ? 'rejected' : 'approved';
    const updated = await prisma.approvalRequest.update({
      where: { id },
      data: { status, respondedAt: new Date() },
      include: { case_: { select: { id: true, title: true } }, client: { select: { id: true, name: true } } },
    });
    return NextResponse.json(updated);
  }
  if (method === 'GET') {
    const list = auth.clientId
      ? await prisma.approvalRequest.findMany({
          where: { clientId: auth.clientId },
          orderBy: { requestedAt: 'desc' },
          take: 100,
          include: { case_: { select: { id: true, title: true } } },
        })
      : await prisma.approvalRequest.findMany({
          orderBy: { requestedAt: 'desc' },
          take: 100,
          include: { case_: { select: { id: true, title: true } }, client: { select: { id: true, name: true } } },
        });
    return NextResponse.json({ data: list });
  }
  return methodNotAllowed();
}

async function handleActivity(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const auth = await getAuthFromRequest(request, 'mobile');
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (method !== 'GET') return methodNotAllowed();
  if (!auth.clientId) return NextResponse.json({ data: [] });
  const limit = Math.min(Number(new URL(request.url).searchParams.get('limit')) || 30, 50);
  const cases = await prisma.case.findMany({
    where: { clientId: auth.clientId, deletedAt: null },
    select: { id: true },
  });
  const caseIds = cases.map((c) => c.id);
  if (caseIds.length === 0) return NextResponse.json({ data: [] });
  const [docs, invoices, caseUpdates] = await Promise.all([
    prisma.document.findMany({
      where: { caseId: { in: caseIds }, deletedAt: null, clientVisible: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, name: true, caseId: true, createdAt: true },
    }),
    prisma.invoice.findMany({
      where: { clientId: auth.clientId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: { id: true, invoiceNumber: true, status: true, amount: true, paidAmount: true, updatedAt: true },
    }),
    prisma.case.findMany({
      where: { id: { in: caseIds } },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: { id: true, title: true, stage: true, updatedAt: true },
    }),
  ]);
  const activities: { type: string; id: string; title: string; subtitle?: string; at: string; meta?: unknown }[] = [];
  docs.forEach((d) => {
    activities.push({ type: 'document', id: d.id, title: d.name, subtitle: 'Dokumen baru', at: d.createdAt.toISOString(), meta: { caseId: d.caseId } });
  });
  invoices.forEach((i) => {
    const title = i.invoiceNumber || i.id;
    const subtitle = i.status === 'paid' ? 'Invoice dibayar' : i.status === 'sent' ? 'Invoice dikirim' : `Invoice: ${i.status}`;
    activities.push({ type: 'invoice', id: i.id, title, subtitle, at: i.updatedAt.toISOString(), meta: { status: i.status, amount: Number(i.amount) } });
  });
  caseUpdates.forEach((c) => {
    activities.push({ type: 'case_milestone', id: c.id, title: c.title, subtitle: `Stage: ${c.stage}`, at: c.updatedAt.toISOString(), meta: { stage: c.stage } });
  });
  activities.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return NextResponse.json({ data: activities.slice(0, limit) });
}

function methodNotAllowed() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
