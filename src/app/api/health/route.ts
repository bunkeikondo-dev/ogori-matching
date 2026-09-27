import { prisma } from '@/lib/prisma';
import { errorResponse, jsonResponse, route } from '@/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error('[health] DB接続に失敗しました。', error);
    return errorResponse('database unavailable', 503);
  }
  return jsonResponse({ status: 'ok', time: new Date().toISOString() });
});
