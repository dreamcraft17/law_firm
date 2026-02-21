/**
 * Handler untuk /api/mobile/* — dipakai app Flutter (law_firm).
 * Path: mobile/auth/login, mobile/cases, mobile/tasks, dll.
 */
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

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
      case 'cases':
        return handleCases(rest, method, request);
      case 'tasks':
        return handleTasks(rest, method, request);
      case 'documents':
        return handleDocuments(rest, method, request);
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
      return NextResponse.json({ error: 'Kredensial tidak valid' }, { status: 401 });
    }
    const token = `mobile_${crypto.randomBytes(24).toString('hex')}`;
    const refreshToken = `mobile_refresh_${crypto.randomBytes(24).toString('hex')}`;
    const userPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: null as string | null,
    };
    return NextResponse.json({
      access_token: token,
      refresh_token: refreshToken,
      user: userPayload,
    });
  }
  if (method !== 'POST' && action !== 'refresh') return methodNotAllowed();
  switch (action) {
    case 'otp/send':
    case 'otp/verify':
    case 'refresh':
    case 'logout':
    case 'reset-password':
      return NextResponse.json({ message: 'Stub', action }, { status: 501 });
    default:
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

async function handleCases(rest: string[], method: string, _request: NextRequest): Promise<NextResponse> {
  const id = rest[0];
  if (id && rest[1]) {
    const sub = rest[1];
    if (sub === 'timeline' || sub === 'team') {
      const data = await prisma.case.findUnique({ where: { id } });
      return NextResponse.json(data ? { data: [] } : { error: 'Not found' }, { status: data ? 200 : 404 });
    }
  }
  if (id) {
    if (method === 'GET') {
      const c = await prisma.case.findFirst({
        where: { id, deletedAt: null },
        include: { client: true },
      });
      return c ? NextResponse.json(c) : NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return methodNotAllowed();
  }
  if (method === 'GET') {
    const list = await prisma.case.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json({ data: list });
  }
  return methodNotAllowed();
}

async function handleTasks(rest: string[], method: string, _request: NextRequest): Promise<NextResponse> {
  const id = rest[0];
  if (id) {
    if (method === 'GET') {
      const t = await prisma.task.findFirst({ where: { id, deletedAt: null } });
      return t ? NextResponse.json(t) : NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (rest[1] === 'status' && method === 'PATCH') {
      return NextResponse.json({ message: 'Stub: update task status' });
    }
    return methodNotAllowed();
  }
  if (method === 'GET') {
    const list = await prisma.task.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json({ data: list });
  }
  return methodNotAllowed();
}

async function handleDocuments(rest: string[], method: string, _request: NextRequest): Promise<NextResponse> {
  if (rest[0] === 'case' && rest[1]) {
    const list = await prisma.document.findMany({
      where: { caseId: rest[1], deletedAt: null },
    });
    return NextResponse.json({ data: list });
  }
  const id = rest[0];
  if (id && method === 'GET') {
    const d = await prisma.document.findFirst({ where: { id, deletedAt: null } });
    return d ? NextResponse.json(d) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (method === 'GET') {
    const list = await prisma.document.findMany({
      where: { deletedAt: null },
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
    if (rest[1] === 'pay' && method === 'POST') return NextResponse.json({ message: 'Stub: pay' });
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
    return NextResponse.json({ message: 'Stub: mark read' });
  }
  if (method === 'GET') {
    const list = await prisma.notification.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ data: list });
  }
  return methodNotAllowed();
}

async function handleMessages(rest: string[], method: string, _request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({ data: [], message: 'Stub: messages (add messages table if needed)' });
}

function methodNotAllowed() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
