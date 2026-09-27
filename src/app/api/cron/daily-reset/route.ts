import type { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, route } from '@/server/http';
import { isAuthorizedCronRequest } from '@/server/cron-auth';
import { resetDaily } from '@/server/queue-service';
import { broadcastCancelledToEntries, broadcastQueueStatus } from '@/server/realtime';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * 日次リセット（Vercel Cronから 15:00 UTC = 00:00 JST に毎日起動）。
 * 待機データ・異常終了データ・過去日の成立中データ・過去日の成立件数を削除する。
 */
async function handle(request: NextRequest): Promise<Response> {
  if (!isAuthorizedCronRequest(request)) {
    return errorResponse('unauthorized', 401);
  }

  const result = await resetDaily(new Date());
  await broadcastCancelledToEntries(
    result.entryIds,
    '日付が変わったため待機がリセットされました。受付時間内に再度お申し込みください。',
  );
  await broadcastQueueStatus();
  return jsonResponse({ ok: true, deletedWaiting: result.deletedWaiting });
}

export const GET = route(handle);
export const POST = route(handle);
