/**
 * Cron: SLA reminders + escalation.
 * Call with GET or POST; secure with CRON_SECRET (header or query).
 * Vercel Cron: set in vercel.json "crons": [{ "path": "/api/cron/sla", "schedule": "0 8 * * *" }]
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const CRON_SECRET = process.env.CRON_SECRET;
// Indonesia WIB = UTC+7
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function isAuthorized(request: NextRequest): boolean {
  if (!CRON_SECRET) return true; // allow when not set (dev)
  const auth = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? request.nextUrl.searchParams.get('secret') ?? '';
  return auth === CRON_SECRET;
}

/** Start of day in WIB (UTC+7), returned as UTC Date. */
function startOfDayWIB(d: Date): Date {
  const wibMs = d.getTime() + WIB_OFFSET_MS;
  const wibMidnight = new Date(wibMs);
  wibMidnight.setUTCHours(0, 0, 0, 0);
  return new Date(wibMidnight.getTime() - WIB_OFFSET_MS);
}

function daysBetween(a: Date, b: Date): number {
  const A = startOfDayWIB(a).getTime();
  const B = startOfDayWIB(b).getTime();
  return Math.round((B - A) / (24 * 60 * 60 * 1000));
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return runSlaCron();
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return runSlaCron();
}

async function runSlaCron(): Promise<NextResponse> {
  const runAt = new Date();
  const now = runAt;
  const remindersSent: string[] = [];
  const escalations: string[] = [];

  try {
    // --- Reminders: cases with slaDueDate in future, reminder day = today (skip SLA-paused)
    const casesWithSla = await prisma.case.findMany({
      where: { deletedAt: null, slaDueDate: { not: null }, slaPausedAt: null },
      include: {
        teamMembers: { select: { userId: true } },
      },
    });

    for (const c of casesWithSla) {
      const due = c.slaDueDate!;
      const daysLeft = daysBetween(now, due);
      if (daysLeft < 0) continue; // past due -> handled by escalation

      const rule = await prisma.slaRule.findFirst({
        where: { caseType: c.caseType ?? '', isActive: true, OR: [{ firmId: c.firmId ?? undefined }, { firmId: null }] },
      });
      const reminderDays = (rule?.reminderDaysBefore as number[] | undefined) ?? [7, 3, 1];

      for (const daysBefore of reminderDays) {
        if (daysLeft !== daysBefore) continue;
        const existing = await prisma.slaReminderSent.findUnique({
          where: { caseId_daysBefore: { caseId: c.id, daysBefore } },
        });
        if (existing) continue;

        const userIds = c.teamMembers.map((m) => m.userId);
        if (userIds.length === 0) {
          // no team: create one notification with null userId so it appears in "broadcast" or assign to firm admins
          await prisma.notification.create({
            data: {
              title: `SLA: "${c.title}" jatuh tempo dalam ${daysBefore} hari`,
              body: `Batas SLA: ${due.toISOString().slice(0, 10)}`,
              caseId: c.id,
              entityType: 'sla_reminder',
            },
          });
        } else {
          for (const userId of userIds) {
            await prisma.notification.create({
              data: {
                userId,
                title: `SLA: "${c.title}" jatuh tempo dalam ${daysBefore} hari`,
                body: `Batas SLA: ${due.toISOString().slice(0, 10)}`,
                caseId: c.id,
                entityType: 'sla_reminder',
              },
            });
          }
        }
        await prisma.slaReminderSent.create({ data: { caseId: c.id, daysBefore } });
        remindersSent.push(`${c.id} (${daysBefore}d)`);
      }
    }

    // --- Escalation: slaDueDate < now, escalatedAt is null, and not SLA-paused
    const toEscalate = await prisma.case.findMany({
      where: {
        deletedAt: null,
        slaDueDate: { lt: now },
        escalatedAt: null,
        slaPausedAt: null,
      },
      include: { teamMembers: { select: { userId: true } } },
    });

    for (const c of toEscalate) {
      const rule = await prisma.slaRule.findFirst({
        where: { caseType: c.caseType ?? '', isActive: true, OR: [{ firmId: c.firmId ?? undefined }, { firmId: null }] },
      });
      const role = rule?.escalationNotifyRole ?? 'partner';

      await prisma.case.update({ where: { id: c.id }, data: { escalatedAt: now } });

      const targets = await prisma.user.findMany({
        where: { deletedAt: null, role: { equals: role, mode: 'insensitive' }, ...(c.firmId ? { firmId: c.firmId } : {}) },
        select: { id: true },
      });
      const userIds = targets.length > 0 ? targets.map((u) => u.id) : c.teamMembers.map((m) => m.userId);
      if (userIds.length === 0) {
        await prisma.notification.create({
          data: {
            title: `[ESCALASI] SLA terlewati: "${c.title}"`,
            body: `Batas SLA telah lewat. Case ID: ${c.id}`,
            caseId: c.id,
            entityType: 'sla_escalation',
          },
        });
      } else {
        for (const userId of userIds) {
          await prisma.notification.create({
            data: {
              userId,
              title: `[ESCALASI] SLA terlewati: "${c.title}"`,
              body: `Batas SLA telah lewat. Case ID: ${c.id}`,
              caseId: c.id,
              entityType: 'sla_escalation',
            },
          });
        }
      }
      escalations.push(c.id);
    }

    await prisma.cronRunLog.create({
      data: { cronName: 'sla', runAt, success: true, remindersSent: remindersSent.length, escalations: escalations.length },
    }).catch(() => {});
    return NextResponse.json({
      ok: true,
      remindersSent: remindersSent.length,
      escalations: escalations.length,
      detail: { remindersSent, escalations },
    });
  } catch (e) {
    console.error('SLA cron error', e);
    await prisma.cronRunLog.create({
      data: { cronName: 'sla', runAt, success: false, remindersSent: 0, escalations: 0, errorMsg: String(e) },
    }).catch(() => {});
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
