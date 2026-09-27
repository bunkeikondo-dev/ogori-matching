import { requireAdmin } from '@/server/admin-auth';
import { jsonResponse, route } from '@/server/http';
import { cancelAllWaiting } from '@/server/queue-service';
import { broadcastCancelledToEntries, broadcastQueueStatus } from '@/server/realtime';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** 緊急機能: 全待機データ削除（待機中の参加者には取り消しを通知する） */
export const DELETE = route(async (request) => {
  const denied = requireAdmin(request);
  if (denied) {
    return denied;
  }

  const { count, entryIds } = await cancelAllWaiting();
  await broadcastCancelledToEntries(
    entryIds,
    '管理者により待機がキャンセルされました。お手数ですが再度お申し込みください。',
  );
  await broadcastQueueStatus();
  return jsonResponse({ ok: true, deleted: count });
});
