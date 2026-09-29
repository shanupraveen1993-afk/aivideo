import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { AI_CONFIG } from '../ai/config';

export function createAdminSessionToken(password: string): string {
  const hash = crypto.createHash('sha256').update(`${password}_${AI_CONFIG.ADMIN_PASSWORD}`).digest('hex');
  return hash;
}

export function isValidAdminSession(token: string | undefined): boolean {
  if (!token || !AI_CONFIG.ADMIN_PASSWORD) return false;
  const expectedHash = createAdminSessionToken(AI_CONFIG.ADMIN_PASSWORD);
  return token === expectedHash;
}

export function verifyAdminRequest(req: NextRequest): boolean {
  const cookieToken = req.cookies.get('maharaja_admin_session')?.value;
  return isValidAdminSession(cookieToken);
}
