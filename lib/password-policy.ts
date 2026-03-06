/**
 * Password policy: panjang, kompleksitas, dan history (no reuse).
 * Compliance: minimal 8 karakter, huruf + angka/special.
 */
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/db';

const MIN_LENGTH = 8;
const HISTORY_COUNT = 5;

/** Returns error message or null if valid. */
export function validatePasswordPolicy(password: string): string | null {
  if (!password || password.length < MIN_LENGTH) {
    return `Password minimal ${MIN_LENGTH} karakter`;
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumberOrSpecial = /[0-9]/.test(password) || /[^a-zA-Z0-9]/.test(password);
  if (!hasLetter || !hasNumberOrSpecial) {
    return 'Password harus mengandung huruf dan angka atau karakter khusus';
  }
  return null;
}

/** Check that new plain password is not in last HISTORY_COUNT. Returns true if allowed (not reused). */
export async function isPasswordNotInHistory(userId: string, plainPassword: string): Promise<boolean> {
  const history = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_COUNT,
    select: { passwordHash: true },
  });
  for (const h of history) {
    if (await bcrypt.compare(plainPassword, h.passwordHash)) return false;
  }
  return true;
}

/** Save password hash to history (call after updating user.passwordHash). */
export async function savePasswordHistory(userId: string, passwordHash: string): Promise<void> {
  await prisma.passwordHistory.create({
    data: { userId, passwordHash },
  });
  // Keep only last HISTORY_COUNT + 2
  const all = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });
  if (all.length > HISTORY_COUNT + 2) {
    const toDelete = all.slice(HISTORY_COUNT + 2).map((r) => r.id);
    await prisma.passwordHistory.deleteMany({ where: { id: { in: toDelete } } });
  }
}
