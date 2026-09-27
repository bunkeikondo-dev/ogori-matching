import crypto from 'node:crypto';
import type { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, ADMIN_SESSION_HOURS } from '@/lib/constants';
import { errorResponse } from './http';
import { safeEqual } from './safe-equal';

export function isAdminConfigured(): boolean {
  return (process.env.ADMIN_PASSCODE ?? '').length > 0;
}

/** パスコード照合（ハッシュ化したうえで定数時間比較） */
export function verifyPasscode(input: string): boolean {
  const expected = process.env.ADMIN_PASSCODE ?? '';
  if (!expected) {
    return false;
  }
  const left = crypto.createHash('sha256').update(input).digest();
  const right = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(left, right);
}

function sessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || `ogori-matching:${process.env.ADMIN_PASSCODE ?? ''}`;
}

function sign(value: string): string {
  return crypto.createHmac('sha256', sessionSecret()).update(value).digest('base64url');
}

/** 署名付きセッショントークン: <有効期限ms>.<HMAC> */
export function createSessionToken(now: number = Date.now()): string {
  const expires = String(now + ADMIN_SESSION_HOURS * 60 * 60 * 1000);
  return `${expires}.${sign(expires)}`;
}

export function verifySessionToken(token: string | undefined | null, now: number = Date.now()): boolean {
  if (!token || !isAdminConfigured()) {
    return false;
  }
  const separator = token.indexOf('.');
  if (separator <= 0) {
    return false;
  }
  const expires = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!/^\d+$/.test(expires) || Number(expires) <= now) {
    return false;
  }
  return safeEqual(signature, sign(expires));
}

export function isAdminRequest(request: NextRequest): boolean {
  return verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value);
}

/** 未認証なら 401 レスポンスを返す。認証済みなら null。 */
export function requireAdmin(request: NextRequest): NextResponse | null {
  if (isAdminRequest(request)) {
    return null;
  }
  return errorResponse('認証が必要です。ログインしてください。', 401);
}

export function setSessionCookie(response: NextResponse): void {
  response.cookies.set(ADMIN_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: ADMIN_SESSION_HOURS * 60 * 60,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(ADMIN_COOKIE, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: 0,
  });
}
