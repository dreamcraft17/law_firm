/**
 * Handler untuk /api/admin/* — dipakai panel admin-web.
 * Path: admin/users, admin/cases, admin/documents, dll.
 */
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { normalizeCaseForResponse, normalizeCaseListForResponse } from './case-response';

const SALT_ROUNDS = 10;

function omitPassword<T extends { passwordHash?: string | null }>(u: T): Omit<T, 'passwordHash'> {
  const { passwordHash: _, ...rest } = u;
  return rest;
}

export async function handleAdmin(
  pathSegments: string[],
  method: string,
  request: NextRequest
): Promise<NextResponse> {
  const [group, ...rest] = pathSegments;

  try {
    switch (group) {
      case 'users':
        return handleUsers(rest, method, request);
      case 'roles':
        return handleRoles(rest, method, request);
      case 'clients':
        return handleClients(rest, method, request);
      case 'cases':
        return handleCases(rest, method, request);
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
      case 'reports':
        return handleReports(rest, method, request);
      case 'settings':
        return handleSettings(rest, method, request);
      case 'audit':
        return handleAudit(rest, method, request);
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
      let body: { name?: string; role?: string; password?: string } = {};
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
      }
      const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
      if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const data: { name?: string; role?: string; passwordHash?: string } = {};
      if (body.name !== undefined) data.name = body.name;
      if (body.role !== undefined) data.role = body.role;
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
    if (rest[1] === 'login-history' && method === 'GET') return NextResponse.json({ data: [] });
    if (rest[1] === 'force-logout' && method === 'POST') return NextResponse.json({ message: 'OK' });
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
    let body: { email: string; name?: string; role?: string; password: string } = { email: '', password: '' };
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
        passwordHash,
      },
    });
    return NextResponse.json(omitPassword(u), { status: 201 });
  }
  return methodNotAllowed();
}

async function handleRoles(rest: string[], method: string, _request: NextRequest): Promise<NextResponse> {
  if (method !== 'GET') return methodNotAllowed();
  const roles = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { role: true },
    distinct: ['role'],
    orderBy: { role: 'asc' },
  });
  return NextResponse.json({ data: roles.map((r) => ({ id: r.role, name: r.role })) });
}

// --- M1: Client Management ---
async function handleClients(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
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

async function handleCases(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const id = rest[0];
  if (id) {
    if (method === 'GET') {
      const c = await prisma.case.findFirst({
        where: { id, deletedAt: null },
        include: { client: true },
      });
      if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(normalizeCaseForResponse(c));
    }
    if (method === 'PUT' || method === 'PATCH') {
      let body: { title?: string; status?: string; clientId?: string | null; client_name?: string; caseNumber?: string; case_number?: string; description?: string | null } = {};
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
      }
      const existing = await prisma.case.findFirst({ where: { id, deletedAt: null } });
      if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const data: { title?: string; status?: string; stage?: string; clientId?: string | null; caseNumber?: string | null; description?: string | null; parties?: unknown } = {};
      if (body.title !== undefined) data.title = body.title.trim();
      if (body.status !== undefined) data.status = body.status;
      if (body.stage !== undefined) data.stage = body.stage;
      if (body.clientId !== undefined || body.client_name !== undefined) data.clientId = await resolveClientId(body);
      if (body.caseNumber !== undefined || body.case_number !== undefined) data.caseNumber = (body.caseNumber ?? body.case_number)?.trim() || null;
      if (body.description !== undefined) data.description = body.description?.trim() || null;
      if (body.parties !== undefined) data.parties = body.parties;
      const c = await prisma.case.update({
        where: { id },
        data,
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
    if (rest[1] === 'team' && method === 'POST') return NextResponse.json({ message: 'OK' });
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
  if (rest[0] === 'conflict-check' && method === 'POST') return NextResponse.json({ data: {} });
  if (method === 'GET') {
    const list = await prisma.case.findMany({
      where: { deletedAt: null },
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
      clientId?: string | null;
      client_name?: string;
      caseNumber?: string;
      case_number?: string;
      description?: string | null;
    } = { title: '' };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    if (!body.title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 });
    const clientId = await resolveClientId(body);
    const c = await prisma.case.create({
      data: {
        title: body.title.trim(),
        status: body.status?.trim() ?? 'open',
        stage: body.stage?.trim() ?? 'intake',
        clientId,
        caseNumber: (body.caseNumber ?? body.case_number)?.trim() || null,
        description: body.description?.trim() || null,
        parties: body.parties ?? null,
      },
      include: { client: true },
    });
    await prisma.auditLog.create({ data: { action: 'create', entity: 'case', entityId: c.id, details: { title: c.title } } }).catch(() => {});
    return NextResponse.json(normalizeCaseForResponse(c), { status: 201 });
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
    if (method === 'GET') {
      const t = await prisma.task.findFirst({ where: { id, deletedAt: null } });
      return t ? NextResponse.json(t) : NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (method === 'PUT' || method === 'PATCH') {
      try {
        const body = await request.json().catch(() => ({}));
        const data: { title?: string; status?: string; caseId?: string | null; dueDate?: Date | null; description?: string | null } = {};
        if (body.title !== undefined) data.title = body.title;
        if (body.status !== undefined) data.status = body.status;
        if (body.caseId !== undefined) data.caseId = body.caseId ?? null;
        if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
        if (body.description !== undefined) data.description = body.description;
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
    const list = await prisma.task.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 500,
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
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
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
      include: { user: { select: { id: true, name: true } } },
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
    });
    return NextResponse.json(updated);
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
      include: { case: { select: { id: true, title: true } }, user: { select: { id: true, name: true } } },
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

async function handleDocuments(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  const id = rest[0];
  if (id && method === 'GET') {
    const d = await prisma.document.findFirst({ where: { id, deletedAt: null } });
    return d ? NextResponse.json(d) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (rest[0] === 'case' && rest[1] && method === 'GET') {
    const list = await prisma.document.findMany({ where: { caseId: rest[1], deletedAt: null } });
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
    const list = await prisma.document.findMany({ where: { deletedAt: null }, take: 100 });
    return NextResponse.json({ data: list });
  }
  return methodNotAllowed();
}

async function handleBilling(rest: string[], method: string, request: NextRequest): Promise<NextResponse> {
  if ((!rest[0] || rest[0] === 'invoices') && method === 'GET' && !rest[1]) {
    const list = await prisma.invoice.findMany({ where: { deletedAt: null }, take: 100, orderBy: { createdAt: 'desc' } });
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
  if (rest[0] === 'invoices' && rest[1] && !rest[2] && (method === 'PUT' || method === 'PATCH')) {
    try {
      const body = await request.json().catch(() => ({}));
      const inv = await prisma.invoice.findFirst({ where: { id: rest[1], deletedAt: null } });
      if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const data: { status?: string; paidAmount?: unknown; invoiceNumber?: string; clientId?: string | null; dueDate?: Date | null } = {};
      if (body.status !== undefined) data.status = body.status;
      if (body.paidAmount !== undefined) data.paidAmount = body.paidAmount;
      if (body.invoiceNumber !== undefined) data.invoiceNumber = body.invoiceNumber;
      if (body.clientId !== undefined) data.clientId = body.clientId ?? null;
      if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
      const updated = await prisma.invoice.update({ where: { id: rest[1] }, data });
      const total = Number(updated.amount);
      const paid = Number(updated.paidAmount);
      if (paid >= total && total > 0) await prisma.invoice.update({ where: { id: rest[1] }, data: { status: 'paid' } });
      else if (paid > 0) await prisma.invoice.update({ where: { id: rest[1] }, data: { status: 'partial_paid' } });
      return NextResponse.json(await prisma.invoice.findUnique({ where: { id: rest[1] } }));
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }
  if (rest[0] === 'invoices' && !rest[1] && method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      const amount = Number(body.amount) || 0;
      const paidAmount = Number(body.paidAmount) || 0;
      const invoiceNumber = body.invoiceNumber ?? `INV-${Date.now()}`;
      const inv = await prisma.invoice.create({
        data: {
          status: body.status ?? 'draft',
          amount,
          paidAmount,
          invoiceNumber,
          clientId: body.clientId ?? null,
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
        },
      });
      return NextResponse.json(inv, { status: 201 });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
    }
  }
  return methodNotAllowed();
}

async function handleReports(rest: string[], method: string, _request: NextRequest): Promise<NextResponse> {
  if (method !== 'GET') return methodNotAllowed();
  const [caseCount, closedCases, userCount, invoiceAgg, tasksCount] = await Promise.all([
    prisma.case.count({ where: { deletedAt: null } }),
    prisma.case.count({ where: { deletedAt: null, status: 'closed' } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.invoice.aggregate({ where: { deletedAt: null }, _sum: { amount: true }, _count: true }),
    prisma.task.count({ where: { deletedAt: null } }),
  ]);
  const activeCases = caseCount - closedCases;
  return NextResponse.json({
    summary: {
      totalCases: caseCount,
      activeCases,
      closedCases,
      totalUsers: userCount,
      totalInvoices: invoiceAgg._count,
      totalRevenue: Number(invoiceAgg._sum.amount ?? 0),
      totalTasks: tasksCount,
    },
    data: [],
  });
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

function methodNotAllowed() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
