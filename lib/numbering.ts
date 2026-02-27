/**
 * Case & invoice number sequence per firm (enterprise numbering).
 * Uses number_sequences table; call from within transaction if needed to lock.
 */
import { prisma } from '@/lib/db';

export async function getNextNumber(
  firmId: string | null,
  entityType: 'case' | 'invoice',
  scopeKey: string
): Promise<number> {
  if (!firmId) return 0;
  const seq = await prisma.$transaction(async (tx) => {
    const row = await tx.numberSequence.findUnique({
      where: { firmId_entityType_scopeKey: { firmId, entityType, scopeKey } },
    });
    const next = (row?.lastValue ?? 0) + 1;
    await tx.numberSequence.upsert({
      where: { firmId_entityType_scopeKey: { firmId, entityType, scopeKey } },
      create: { firmId, entityType, scopeKey, lastValue: next },
      update: { lastValue: next, updatedAt: new Date() },
    });
    return next;
  });
  return seq;
}

/** Format case number: prefix from config or "CASE-{year}-{seq}" */
export function formatCaseNumber(prefix: string | null, year: number, seq: number): string {
  const p = (prefix || 'CASE').trim();
  return `${p}-${year}-${String(seq).padStart(5, '0')}`;
}

/** Format invoice number: prefix from config or "INV-{year}-{seq}" */
export function formatInvoiceNumber(prefix: string | null, year: number, seq: number): string {
  const p = (prefix || 'INV').trim();
  return `${p}-${year}-${String(seq).padStart(5, '0')}`;
}
