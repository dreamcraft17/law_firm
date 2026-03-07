/**
 * Auth & permission helpers for admin and mobile API.
 * Token is sent as Authorization: Bearer <token>. Session stored in DB.
 */
import { prisma } from '@/lib/db';
import { NextRequest } from 'next/server';

const SESSION_EXPIRY_DAYS = 30;
const SESSION_REMEMBER_ME_DAYS = 90;
const SESSION_MAX_CONCURRENT = 5;

export type AuthUser = {
  userId: string;
  firmId: string | null;
  roleId: string | null;
  roleName: string;
  permissions: string[];
  clientId: string | null;
  isAdmin: boolean;
};

export async function getAuthFromRequest(request: NextRequest, source: 'admin' | 'mobile'): Promise<AuthUser | null> {
  const auth = request.headers.get('Authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  if (!token) return null;

  const session = await prisma.session.findFirst({
    where: { token, source, expiresAt: { gt: new Date() } },
    include: { user: { include: { roleRef: { include: { permissions: { include: { permission: true } } } } } } },
  });
  if (!session?.user || session.user.deletedAt) return null;
  // Update lastActiveAt roughly every 5 min to limit DB writes
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  if (!session.lastActiveAt || session.lastActiveAt < fiveMinAgo) {
    prisma.session.update({ where: { id: session.id }, data: { lastActiveAt: new Date() } }).catch(() => {});
  }

  const user = session.user;
  const role = user.roleRef;
  const permissions: string[] = role
    ? role.permissions.map((rp) => rp.permission.key)
    : [];
  const isAdmin = permissions.includes('admin.see_all') || user.role === 'admin';

  return {
    userId: user.id,
    firmId: user.firmId ?? null,
    roleId: user.roleId,
    roleName: user.role,
    permissions,
    clientId: user.clientId,
    isAdmin,
  };
}

export function hasPermission(auth: AuthUser | null, permission: string): boolean {
  if (!auth) return false;
  if (auth.isAdmin) return true;
  return auth.permissions.includes(permission);
}

export function requireAuth(auth: AuthUser | null): AuthUser {
  if (!auth) throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  return auth;
}

export function requirePermission(auth: AuthUser | null, permission: string): AuthUser {
  const a = requireAuth(auth);
  if (!hasPermission(a, permission)) {
    throw new Response(JSON.stringify({ error: 'Forbidden', required: permission }), { status: 403 });
  }
  return a;
}

export async function createSession(
  userId: string,
  source: 'admin' | 'mobile',
  refreshToken?: string,
  device?: { userAgent?: string; deviceId?: string; deviceLabel?: string; ipAddress?: string },
  rememberMe?: boolean
): Promise<string> {
  const now = new Date();
  const expiryDays = rememberMe ? SESSION_REMEMBER_ME_DAYS : SESSION_EXPIRY_DAYS;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);
  const existing = await prisma.session.findMany({
    where: { userId, source, expiresAt: { gt: now } },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (existing.length >= SESSION_MAX_CONCURRENT) {
    const toDelete = existing.slice(0, existing.length - SESSION_MAX_CONCURRENT + 1).map((s) => s.id);
    await prisma.session.deleteMany({ where: { id: { in: toDelete } } });
  }
  const crypto = await import('crypto');
  const token = source === 'admin' ? `admin_${crypto.randomBytes(24).toString('hex')}` : `mobile_${crypto.randomBytes(24).toString('hex')}`;
  await prisma.session.create({
    data: {
      userId,
      token,
      source,
      expiresAt,
      rememberMe: rememberMe ?? false,
      refreshToken: refreshToken ?? null,
      userAgent: device?.userAgent?.slice(0, 500) ?? null,
      deviceId: device?.deviceId ?? null,
      deviceLabel: device?.deviceLabel ?? null,
      ipAddress: device?.ipAddress ?? null,
      lastActiveAt: new Date(),
    },
  });
  return token;
}

export async function getPermissionsForUser(userId: string): Promise<{ roleId: string | null; permissions: string[] }> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: { roleRef: { include: { permissions: { include: { permission: true } } } } },
  });
  if (!user?.roleRef) return { roleId: null, permissions: [] };
  const permissions = user.roleRef.permissions.map((rp) => rp.permission.key);
  return { roleId: user.roleId, permissions };
}
