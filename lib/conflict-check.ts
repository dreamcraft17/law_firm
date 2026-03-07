/**
 * Shared conflict check logic for case create (admin + mobile).
 * Used to run conflict check and save CaseConflictSnapshot.
 */
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

function normalizeForConflict(s: string): string {
  return s.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function diceSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigrams = (str: string): Map<string, number> => {
    const m = new Map<string, number>();
    for (let i = 0; i < str.length - 1; i++) {
      const bg = str.slice(i, i + 2);
      m.set(bg, (m.get(bg) ?? 0) + 1);
    }
    return m;
  };
  const aMap = bigrams(a);
  const bMap = bigrams(b);
  let intersection = 0;
  aMap.forEach((count, bg) => { intersection += Math.min(count, bMap.get(bg) ?? 0); });
  return (2 * intersection) / (a.length - 1 + (b.length - 1));
}

/** Levenshtein edit distance (untuk typo: Budi vs Budy, Ahmad vs Ahmud). */
function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[] = new Array(rows * cols);
  for (let i = 0; i <= a.length; i++) dp[i * cols] = i;
  for (let j = 0; j <= b.length; j++) dp[j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i * cols + j] = Math.min(
        dp[(i - 1) * cols + j] + 1,
        dp[i * cols + (j - 1)] + 1,
        dp[(i - 1) * cols + (j - 1)] + cost
      );
    }
  }
  return dp[rows * cols - 1];
}

/** Fuzzy match: ejaan mirip (Budi/Budy) atau substring. Threshold 0.65 + edit distance untuk nama pendek. */
const DICE_THRESHOLD = 0.65;
const MAX_EDIT_RATIO_SHORT = 0.35; // untuk nama <= 8 karakter, max edit distance ratio

function namesConflict(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  const sim = diceSimilarity(a, b);
  if (sim >= DICE_THRESHOLD) return true;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen <= 8) {
    const dist = levenshtein(a, b);
    if (dist <= 2 && dist / maxLen <= MAX_EDIT_RATIO_SHORT) return true;
  }
  return false;
}

export type ConflictItem = { caseId: string; title: string; reason: string; matchedName?: string; similarity?: number };

export type RunConflictCheckParams = {
  clientId: string | null;
  excludeCaseId?: string | null;
  parties?: Record<string, string> | null;
  partyNames?: string[];
  client_name?: string | null;
};

/** Run conflict check; returns snapshot for saving on case create. */
export async function runConflictCheck(params: RunConflictCheckParams): Promise<{ hasConflict: boolean; conflicts: ConflictItem[] }> {
  const { clientId, excludeCaseId, parties, partyNames = [], client_name } = params;
  const conflicts: ConflictItem[] = [];
  if (clientId) {
    const sameClient = await prisma.case.findMany({
      where: { clientId, deletedAt: null, ...(excludeCaseId ? { id: { not: excludeCaseId } } : {}) },
      select: { id: true, title: true },
    });
    sameClient.forEach((c) => conflicts.push({ caseId: c.id, title: c.title, reason: 'same_client', matchedName: 'Klien sama' }));
  }
  const names: string[] = [...partyNames];
  if (parties && typeof parties === 'object') {
    ['plaintiff', 'defendant', 'instansi', 'opposing_party'].forEach((k) => {
      const v = parties[k];
      if (v && typeof v === 'string' && v.trim()) names.push(v.trim());
    });
  }
  if (client_name && typeof client_name === 'string' && client_name.trim()) names.push(client_name.trim());
  if (names.length > 0) {
    const allCases = await prisma.case.findMany({
      where: { deletedAt: null, ...(excludeCaseId ? { id: { not: excludeCaseId } } : {}) },
      select: { id: true, title: true, parties: true, client: { select: { name: true } } },
    });
    for (const c of allCases) {
      const existing: string[] = [];
      if (c.client?.name) existing.push(c.client.name);
      const p = c.parties as Record<string, string> | null;
      if (p && typeof p === 'object') {
        ['plaintiff', 'defendant', 'instansi', 'opposing_party'].forEach((k) => {
          const v = p[k];
          if (v && typeof v === 'string') existing.push(v);
        });
      }
      for (const name of names) {
        const nNorm = normalizeForConflict(name);
        if (!nNorm) continue;
        for (const e of existing) {
          const eNorm = normalizeForConflict(e);
          if (!eNorm) continue;
          const sim = diceSimilarity(eNorm, nNorm);
          if (namesConflict(eNorm, nNorm)) {
            conflicts.push({ caseId: c.id, title: c.title, reason: 'party_overlap', matchedName: e, similarity: Math.round(sim * 100) });
            break;
          }
        }
      }
    }
  }
  return { hasConflict: conflicts.length > 0, conflicts };
}

/** Save conflict snapshot for a case (call after case create). */
export async function saveConflictSnapshot(params: {
  caseId: string;
  hasConflict: boolean;
  conflicts: ConflictItem[];
  checkedById?: string | null;
}): Promise<void> {
  const { caseId, hasConflict, conflicts, checkedById } = params;
  await prisma.caseConflictSnapshot.upsert({
    where: { caseId },
    create: { caseId, hasConflict, conflicts: conflicts as Prisma.InputJsonValue, checkedById: checkedById ?? null },
    update: { hasConflict, conflicts: conflicts as Prisma.InputJsonValue, checkedById: checkedById ?? null },
  }).catch(() => {});
}
