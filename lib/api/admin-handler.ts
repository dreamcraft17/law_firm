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
      case 'cases':
        return handleCases(rest, method, request);
      case 'documents':
        return handleDocuments(rest, method, request);
      case 'tasks':
        return handleTasks(rest, method, request);
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

/** Resolve clientId dari client_name (find or create) untuk case create/update. */
async function resolveClientId(body: { clientId?: string | null; client_name?: string }): Promise<string | null> {
  if (body.clientId) return body.clientId;
  const name = body.client_name?.trim();
  if (!name) return null;
  let client = await prisma.user.findFirst({ where: { name, deletedAt: null } });
  if (!client) {
    client = await prisma.user.create({
      data: {
        name,
        email: `${name.toLowerCase().replace(/\s+/g, '.')}.${Date.now()}@client.local`,
        role: 'client',
      },
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
      const data: { title?: string; status?: string; clientId?: string | null; caseNumber?: string | null; description?: string | null } = {};
      if (body.title !== undefined) data.title = body.title.trim();
      if (body.status !== undefined) data.status = body.status;
      if (body.clientId !== undefined || body.client_name !== undefined) data.clientId = await resolveClientId(body);
      if (body.caseNumber !== undefined || body.case_number !== undefined) data.caseNumber = (body.caseNumber ?? body.case_number)?.trim() || null;
      if (body.description !== undefined) data.description = body.description?.trim() || null;
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
        clientId,
        caseNumber: (body.caseNumber ?? body.case_number)?.trim() || null,
        description: body.description?.trim() || null,
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
        const data: { title?: string; status?: string; caseId?: string | null } = {};
        if (body.title !== undefined) data.title = body.title;
        if (body.status !== undefined) data.status = body.status;
        if (body.caseId !== undefined) data.caseId = body.caseId ?? null;
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
        data: { title: body.title, status: body.status ?? 'pending', caseId: body.caseId ?? null },
      });
      return NextResponse.json(t, { status: 201 });
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
        items.map((d: { name: string; caseId?: string }) =>
          prisma.document.create({
            data: { name: String(d.name ?? 'Unnamed'), caseId: d.caseId ?? caseId },
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
    const updated = await prisma.invoice.update({ where: { id: rest[1] }, data: { status: 'approved' } });
    return NextResponse.json(updated);
  }
  if (rest[0] === 'invoices' && !rest[1] && method === 'POST') {
    try {
      const body = await request.json();
      const amount = Number(body.amount) || 0;
      const inv = await prisma.invoice.create({
        data: { status: body.status ?? 'draft', amount },
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
