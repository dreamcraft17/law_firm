/**
 * Auth & permission helpers for admin and mobile API.
 * Token is sent as Authorization: Bearer <token>. Session stored in DB.
 */
import { prisma } from '@/lib/db';
import { NextRequest } from 'next/server';

const SESSION_EXPIRY_DAYS = 30;

export type AuthUser = {
  userId: string;
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

  const user = session.user;
  const role = user.roleRef;
  const permissions: string[] = role
    ? role.permissions.map((rp) => rp.permission.key)
    : [];
  const isAdmin = permissions.includes('admin.see_all') || user.role === 'admin';

  return {
    userId: user.id,
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

export async function createSession(userId: string, source: 'admin' | 'mobile', refreshToken?: string): Promise<string> {
  const crypto = await import('crypto');
  const token = source === 'admin' ? `admin_${crypto.randomBytes(24).toString('hex')}` : `mobile_${crypto.randomBytes(24).toString('hex')}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);
  await prisma.session.create({
    data: { userId, token, source, expiresAt, refreshToken: refreshToken ?? null },
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
