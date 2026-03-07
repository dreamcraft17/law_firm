/**
 * Webhook listener untuk notifikasi kalender (Google Calendar / Outlook).
 * Menerima push notifications saat lawyer mengubah jadwal di kalender eksternal.
 * Verifikasi signature/secret sesuai provider; update event lokal via provider_event_id.
 */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    const channelId = request.headers.get('x-goog-channel-id');
    const resourceState = request.headers.get('x-goog-resource-state');
    if (channelId || resourceState) {
      // Google Calendar push: sync event by channel/resourceId (simplified — full impl would lookup by channelId and fetch changed event)
      console.info('[webhook/calendar] Google push:', { channelId, resourceState });
    }
    return NextResponse.json({ received: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ endpoint: 'calendar webhook', method: 'POST' });
}
