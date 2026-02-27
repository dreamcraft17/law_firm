/**
 * TOTP (2FA) — generate secret and verify 6-digit code.
 * Uses Node crypto; no external TOTP package.
 */
import { createHmac, randomBytes } from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(str: string): Buffer {
  const clean = str.replace(/=+$/, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const c of clean) {
    const idx = BASE32_ALPHABET.indexOf(c);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

/** Generate a new TOTP secret (base32, for QR code / authenticator app). */
export function generateTotpSecret(): string {
  const bytes = randomBytes(20);
  let result = '';
  let buffer = 0;
  let bits = 0;
  for (const b of bytes) {
    buffer = (buffer << 8) | b;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += BASE32_ALPHABET[(buffer >>> bits) & 31];
    }
  }
  if (bits > 0) result += BASE32_ALPHABET[(buffer << (5 - bits)) & 31];
  return result;
}

/** Verify a 6-digit TOTP code (window = ±1 period to allow clock drift). */
export function verifyTotp(secretBase32: string, code: string, window = 1): boolean {
  const secret = base32Decode(secretBase32);
  const period = 30;
  const now = Math.floor(Date.now() / 1000);
  for (let i = -window; i <= window; i++) {
    const counter = Math.floor(now / period) + i;
    const hexCounter = counter.toString(16).padStart(16, '0');
    const hmac = createHmac('sha1', secret).update(Buffer.from(hexCounter, 'hex')).digest();
    const offset = hmac[hmac.length - 1]! & 0x0f;
    const binary = ((hmac[offset]! & 0x7f) << 24) | ((hmac[offset + 1]! & 0xff) << 16) | ((hmac[offset + 2]! & 0xff) << 8) | (hmac[offset + 3]! & 0xff);
    const otp = (binary % 1_000_000).toString().padStart(6, '0');
    if (otp === code.trim()) return true;
  }
  return false;
}

/** otpauth URI for QR code (e.g. otpauth://totp/App:user@email?secret=...) */
export function getTotpUri(secret: string, label: string, issuer = 'Firma Hukum'): string {
  const encodedLabel = encodeURIComponent(issuer + ':' + label);
  return `otpauth://totp/${encodedLabel}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
}
