/**
 * Optional email channel for notifications.
 * Set SENDGRID_API_KEY and NOTIFICATION_EMAIL_FROM to enable.
 * When not set, no email is sent (in-app only).
 */

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY?.trim();
const FROM_EMAIL = process.env.NOTIFICATION_EMAIL_FROM?.trim() ?? process.env.SENDGRID_FROM?.trim();

export function isEmailEnabled(): boolean {
  return !!(SENDGRID_API_KEY && FROM_EMAIL);
}

/**
 * Send a single notification email. No-op if SendGrid not configured.
 */
export async function sendNotificationEmail(to: string, subject: string, textBody: string): Promise<void> {
  if (!SENDGRID_API_KEY || !FROM_EMAIL || !to?.trim()) return;
  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to.trim() }] }],
        from: { email: FROM_EMAIL, name: 'Law Firm Notifikasi' },
        subject: subject.slice(0, 255),
        content: [{ type: 'text/plain', value: textBody.slice(0, 10000) }],
      }),
    });
    if (!res.ok) {
      console.warn('SendGrid error:', res.status, await res.text());
    }
  } catch (e) {
    console.warn('sendNotificationEmail failed', e);
  }
}
