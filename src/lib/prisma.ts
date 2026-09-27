import { PrismaClient } from '@prisma/client';

/**
 * サーバーレス環境ではウォームスタート時にモジュールが再利用されることがあるため、
 * PrismaClientの多重生成（コネクション浪費）を防ぐために globalThis で共有する。
 * DATABASE_URL には Supabase の Transaction Pooler（ポート6543・pgbouncer=true）を使うこと。
 */
const globalForPrisma = globalThis as unknown as { __ogoriPrisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.__ogoriPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  });

globalForPrisma.__ogoriPrisma = prisma;
