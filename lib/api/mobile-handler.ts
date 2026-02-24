/**
 * Handler untuk /api/mobile/* — dipakai app Flutter (law_firm).
 * Path: mobile/auth/login, mobile/cases, mobile/tasks, dll.
 * R0: Login return roleId + permissions; R0.2: Row-level case access (team/client).
 */
import bcrypt from 'bcrypt';
import crypto from 'crypto';
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
    const token = await createSession(user.id, 'mobile');
    const refreshToken = `mobile_refresh_${crypto.randomBytes(24).toString('hex')}`;
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
    return NextResponse.json({
      access_token: `mobile_${crypto.randomBytes(24).toString('hex')}`,
      refresh_token: refresh,
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
  
  // Handle /cases/{id} with specific ID
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
    if (method === 'GET') {
      const t = await prisma.task.findFirst({ where: { id, deletedAt: null }, include: { case: true } });
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

  if (rest[0] === 'case' && rest[1]) {
    const caseId = rest[1];
    if (!(await canAccessCase(caseId, auth))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const list = await prisma.document.findMany({
      where: { caseId, deletedAt: null },
    });
    return NextResponse.json({ data: list });
  }
  const id = rest[0];
  if (id && method === 'GET') {
    const d = await prisma.document.findFirst({ where: { id, deletedAt: null } });
    if (!d) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (d.caseId && !(await canAccessCase(d.caseId, auth))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json(d);
  }
  if (method === 'GET') {
    const list = await prisma.document.findMany({
      where: {
        deletedAt: null,
        ...(Object.keys(caseWhere).length ? { case: { deletedAt: null, ...caseWhere } } : {}),
      },
      take: 100,
    });
    return NextResponse.json({ data: list });
  }
  return methodNotAllowed();
}

async function handleEvents(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const id = rest[0];
  if (id && method === 'GET') {
    const e = await prisma.event.findFirst({ where: { id, deletedAt: null } });
    return e ? NextResponse.json(e) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (method === 'GET') {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const where: { deletedAt: null; startAt?: { gte?: Date; lte?: Date } } = { deletedAt: null };
    if (from) where.startAt = { ...where.startAt, gte: new Date(from) };
    if (to) where.startAt = { ...where.startAt, lte: new Date(to) };
    const list = await prisma.event.findMany({ where, orderBy: { startAt: 'asc' }, take: 200 });
    return NextResponse.json({ data: list });
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

async function handleDashboard(_rest: string[], method: string, _request: NextRequest): Promise<NextResponse> {
  if (method !== 'GET') return methodNotAllowed();
  const [summary, activity] = await Promise.all([
    prisma.case.count({ where: { deletedAt: null } }),
    prisma.case.findMany({ where: { deletedAt: null }, orderBy: { updatedAt: 'desc' }, take: 10 }),
  ]);
  return NextResponse.json({
    summary: { totalCases: summary },
    activity: activity.map((a) => ({ id: a.id, title: a.title, updatedAt: a.updatedAt })),
  });
}

async function handleNotifications(rest: string[], method: string, _request: NextRequest): Promise<NextResponse> {
  const id = rest[0];
  if (id && rest[1] === 'read' && method === 'POST') {
    const n = await prisma.notification.findFirst({ where: { id } });
    if (!n) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
    return NextResponse.json({ message: 'OK' });
  }
  if (method === 'GET') {
    const list = await prisma.notification.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ data: list });
  }
  return methodNotAllowed();
}

async function handleMessages(rest: string[], method: string, _request: NextRequest): Promise<NextResponse> {
  if (method === 'GET') return NextResponse.json({ data: [] });
  return methodNotAllowed();
}

function methodNotAllowed() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
