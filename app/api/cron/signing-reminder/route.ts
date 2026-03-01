/**
 * Cron: Reminder for pending e-signature (signer belum tanda tangan).
 * Call with GET or POST; secure with CRON_SECRET.
 * Run daily e.g. "0 9 * * *" (9am).
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const CRON_SECRET = process.env.CRON_SECRET;

function isAuthorized(request: NextRequest): boolean {
  if (!CRON_SECRET) return true;
  const auth = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? request.nextUrl.searchParams.get('secret') ?? '';
  return auth === CRON_SECRET;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return runSigningReminder();
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return runSigningReminder();
}

async function runSigningReminder(): Promise<NextResponse> {
  const now = new Date();
  let remindersCreated = 0;

  try {
    const pending = await prisma.documentSigningRequest.findMany({
      where: {
        status: 'pending',
        cancelledAt: null,
        OR: [{ expiryAt: null }, { expiryAt: { gt: now } }],
      },
      include: {
        document: { select: { id: true, name: true, caseId: true } },
        signers: { select: { id: true, email: true, signedAt: true } },
      },
    });

    for (const req of pending) {
      const unsignedCount = req.signers.filter((s) => !s.signedAt).length;
      if (unsignedCount === 0) continue;

      const docName = req.document?.name ?? req.documentId;
      const caseId = req.document?.caseId ?? null;
      let userIds: string[] = [];

      if (caseId) {
        const members = await prisma.caseTeamMember.findMany({
          where: { caseId },
          select: { userId: true },
        });
        userIds = members.map((m) => m.userId);
      }

      const title = `Reminder: Tanda tangan tertunda - ${docName}`;
      const body = `${unsignedCount} signer belum tanda tangan.`;

      if (userIds.length > 0) {
        for (const userId of userIds) {
          await prisma.notification.create({
            data: {
              userId,
              title,
              body,
              caseId,
              entityType: 'signing_reminder',
            },
          });
          remindersCreated += 1;
        }
      } else {
        await prisma.notification.create({
          data: {
            title,
            body,
            caseId,
            entityType: 'signing_reminder',
          },
        });
        remindersCreated += 1;
      }
    }

    return NextResponse.json({ ok: true, remindersCreated });
  } catch (e) {
    console.error('Signing reminder cron error', e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
