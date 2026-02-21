/**
 * Handler untuk /api/admin/* — dipakai panel admin-web.
 * Path: admin/users, admin/cases, admin/documents, dll.
 */
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

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

async function handleUsers(rest: string[], method: string, _request: NextRequest): Promise<NextResponse> {
  const id = rest[0];
  if (id) {
    if (method === 'GET') {
      const u = await prisma.user.findFirst({ where: { id, deletedAt: null } });
      return u ? NextResponse.json(u) : NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (method === 'PUT' || method === 'PATCH') return NextResponse.json({ message: 'Stub: update user' });
    if (method === 'DELETE') return NextResponse.json({ message: 'Stub: delete user' });
    if (rest[1] === 'login-history' && method === 'GET') return NextResponse.json({ data: [] });
    if (rest[1] === 'force-logout' && method === 'POST') return NextResponse.json({ message: 'OK' });
    return methodNotAllowed();
  }
  if (method === 'GET') {
    const list = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json({ data: list });
  }
  if (method === 'POST') return NextResponse.json({ message: 'Stub: create user' });
  return methodNotAllowed();
}

async function handleRoles(rest: string[], method: string, _request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({ data: [], message: 'Stub: roles (add roles table if needed)' });
}

async function handleCases(rest: string[], method: string, _request: NextRequest): Promise<NextResponse> {
  const id = rest[0];
  if (id) {
    if (method === 'GET') {
      const c = await prisma.case.findFirst({
        where: { id, deletedAt: null },
        include: { client: true },
      });
      return c ? NextResponse.json(c) : NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (method === 'PUT' || method === 'PATCH') return NextResponse.json({ message: 'Stub: update case' });
    if (method === 'DELETE') return NextResponse.json({ message: 'Stub: delete case' });
    if (rest[1] === 'team' && method === 'POST') return NextResponse.json({ message: 'Stub: assign team' });
    if (rest[1] === 'export' && method === 'GET') return NextResponse.json({ message: 'Stub: export' });
    return methodNotAllowed();
  }
  if (rest[0] === 'conflict-check' && method === 'POST') return NextResponse.json({ data: {} });
  if (method === 'GET') {
    const list = await prisma.case.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json({ data: list });
  }
  if (method === 'POST') return NextResponse.json({ message: 'Stub: create case' });
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
