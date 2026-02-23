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
  return NextResponse.json({ data: [], message: 'Stub: roles (add roles table if needed)' });
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
      return NextResponse.json(normalizeCaseForResponse(c));
    }
    if (method === 'DELETE') {
      const existing = await prisma.case.findFirst({ where: { id, deletedAt: null } });
      if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      await prisma.case.update({ where: { id }, data: { deletedAt: new Date() } });
      return NextResponse.json({ message: 'OK' });
    }
    if (rest[1] === 'team' && method === 'POST') return NextResponse.json({ message: 'OK' });
    if (rest[1] === 'export' && method === 'GET') return NextResponse.json({ message: 'Stub: export' });
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
    return NextResponse.json(normalizeCaseForResponse(c), { status: 201 });
  }
  return methodNotAllowed();
}

async function handleDocuments(rest: string[], method: string, _request: NextRequest): Promise<NextResponse> {
  const id = rest[0];
  if (id && method === 'GET') {
    const d = await prisma.document.findFirst({ where: { id, deletedAt: null } });
    return d ? NextResponse.json(d) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (rest[0] === 'case' && rest[1] && method === 'GET') {
    const list = await prisma.document.findMany({ where: { caseId: rest[1], deletedAt: null } });
    return NextResponse.json({ data: list });
  }
  if (rest[0] === 'bulk-upload' && method === 'POST') return NextResponse.json({ message: 'Stub: bulk upload' });
  if (method === 'GET') {
    const list = await prisma.document.findMany({ where: { deletedAt: null }, take: 100 });
    return NextResponse.json({ data: list });
  }
  return methodNotAllowed();
}

async function handleBilling(rest: string[], method: string, _request: NextRequest): Promise<NextResponse> {
  if (rest[0] === 'invoices' && method === 'GET') {
    const list = await prisma.invoice.findMany({ where: { deletedAt: null }, take: 100 });
    return NextResponse.json({ data: list });
  }
  if (rest[0] === 'invoices' && rest[1] && method === 'GET') {
    const i = await prisma.invoice.findFirst({ where: { id: rest[1], deletedAt: null } });
    return i ? NextResponse.json(i) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ data: [], message: 'Stub: billing' });
}

async function handleReports(rest: string[], method: string, _request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({ summary: {}, message: 'Stub: reports' });
}

async function handleSettings(rest: string[], method: string, _request: NextRequest): Promise<NextResponse> {
  if (method === 'GET') {
    const list = await prisma.systemSetting.findMany({ take: 200 });
    return NextResponse.json({ data: list });
  }
  return NextResponse.json({ message: 'Stub: settings' });
}

async function handleAudit(rest: string[], method: string, _request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({ data: [], message: 'Stub: audit (add audit_logs table if needed)' });
}

function methodNotAllowed() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
