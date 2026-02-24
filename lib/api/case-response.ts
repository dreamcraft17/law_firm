/**
 * Normalisasi response case agar konsisten untuk admin-web dan law_firm (mobile).
 * Menambah client_name dan alias snake_case (case_number, created_at, updated_at).
 */
type CaseWithClient = {
  id: string;
  title: string;
  caseNumber?: string | null;
  description?: string | null;
  status: string;
  clientId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  client?: { id: string; name: string; type?: string } | null;
};

export function normalizeCaseForResponse(c: CaseWithClient): Record<string, unknown> {
  const clientName = c.client?.name ?? null;
  const base = { ...c } as Record<string, unknown>;
  base.client_name = clientName;
  base.case_number = c.caseNumber ?? null;
  base.created_at = c.createdAt;
  base.updated_at = c.updatedAt;
  return base;
}

export function normalizeCaseListForResponse(list: CaseWithClient[]): Record<string, unknown>[] {
  return list.map(normalizeCaseForResponse);
}
