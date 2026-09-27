import { prisma } from '@/lib/prisma';

/**
 * 管理画面ログインの総当たり対策。
 * サーバーレス環境ではプロセス内メモリを複数インスタンス間で共有できないため、DBで管理する。
 */
const MAX_FAILURES = 5;
const WINDOW_MS = 10 * 60 * 1000;

export async function isLoginBlocked(ip: string, now: Date = new Date()): Promise<boolean> {
  const attempt = await prisma.loginAttempt.findUnique({ where: { ip } });
  if (!attempt) {
    return false;
  }
  if (attempt.resetAt.getTime() <= now.getTime()) {
    await prisma.loginAttempt.delete({ where: { ip } }).catch(() => undefined);
    return false;
  }
  return attempt.count >= MAX_FAILURES;
}

export async function recordLoginFailure(ip: string, now: Date = new Date()): Promise<void> {
  const attempt = await prisma.loginAttempt.findUnique({ where: { ip } });
  if (!attempt || attempt.resetAt.getTime() <= now.getTime()) {
    await prisma.loginAttempt.upsert({
      where: { ip },
      create: { ip, count: 1, resetAt: new Date(now.getTime() + WINDOW_MS) },
      update: { count: 1, resetAt: new Date(now.getTime() + WINDOW_MS) },
    });
    return;
  }
  await prisma.loginAttempt.update({ where: { ip }, data: { count: { increment: 1 } } });
}

export async function clearLoginFailures(ip: string): Promise<void> {
  await prisma.loginAttempt.delete({ where: { ip } }).catch(() => undefined);
}
