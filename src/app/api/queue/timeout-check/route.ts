import { errorResponse, jsonResponse, readJson, route } from '@/server/http';
import { checkTimeout } from '@/server/queue-service';
import { broadcastQueueStatus } from '@/server/realtime';
import type { TimeoutCheckResult } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * 待機画面のカウントダウンが0になった際に呼ばれる。
 * サーバー側でも期限切れを確認し、本当に期限切れであれば削除してタイムアウト画面へ、
 * ぎりぎりで成立していた場合は成立結果を返してマッチ成立画面へ誘導する（レース対策）。
 */
export const POST = route(async (request) => {
  const body = await readJson(request);
  const entryId =
    typeof body === 'object' && body !== null && typeof (body as Record<string, unknown>).entryId === 'string'
      ? ((body as Record<string, unknown>).entryId as string)
      : '';
  const token =
    typeof body === 'object' && body !== null && typeof (body as Record<string, unknown>).token === 'string'
      ? ((body as Record<string, unknown>).token as string)
      : '';

  if (!entryId || !token || entryId.length > 100 || token.length > 200) {
    return errorResponse('リクエストが不正です。', 400);
  }

  const result = await checkTimeout(entryId, token);
  if (result.notFound || result.expired) {
    await broadcastQueueStatus();
    const ack: TimeoutCheckResult = { expired: true };
    return jsonResponse(ack);
  }
  if (result.match) {
    const ack: TimeoutCheckResult = { expired: false, match: result.match };
    return jsonResponse(ack);
  }
  // まだ期限切れではない（クライアントの時計が僅かに先行していた場合）
  return jsonResponse({ expired: false });
});
