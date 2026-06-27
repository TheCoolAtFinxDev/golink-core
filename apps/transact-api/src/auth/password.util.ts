import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const KEY_LENGTH = 64;
const SCHEME = 'scrypt';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const key = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${SCHEME}:${salt}:${key}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [scheme, salt, storedKey] = stored.split(':');
  if (!scheme || !salt || !storedKey || scheme !== SCHEME) return false;
  const derived = scryptSync(password, salt, KEY_LENGTH);
  const storedBuf = Buffer.from(storedKey, 'hex');
  if (storedBuf.length !== derived.length) return false;
  return timingSafeEqual(derived, storedBuf);
}
