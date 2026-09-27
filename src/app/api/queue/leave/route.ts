import type { NextRequest } from 'next/server';
import { errorResponse, jsonResponse, route } from '@/server/http';
import { leaveByToken } from '@/server/queue-service';
import { broadcastQueueStatus } from '@/server/realtime';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * 待機キャンセル（旧Socket.IO版の queue:leave に相当）。
 * ブラウザのタブ終了・リロード時は navigator.sendBeacon から呼ばれるため、
 * Content-Type が text/plain で届く場合も考慮してテキストとして読み、自前でJSONパースする。
 */
async function readEntryPayload(request: NextRequest): Promise<{ entryId: string; token: string } | null> {
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return null;
  }
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as Record<string, unknown>).entryId === 'string' &&
      typeof (parsed as Record<string, unknown>).token === 'string'
    ) {
      return {
        entryId: (parsed as Record<string, unknown>).entryId as string,
        token: (parsed as Record<string, unknown>).token as string,
      };
    }
  } catch {
    // noop
  }
  return null;
}

export const POST = route(async (request) => {
  const payload = await readEntryPayload(request);
  if (!payload || payload.entryId.length > 100 || payload.token.length > 200) {
    return errorResponse('リクエストが不正です。', 400);
  }

  const removed = await leaveByToken(payload.entryId, payload.token);
  if (removed) {
    await broadcastQueueStatus();
  }
  return jsonResponse({ ok: true });
});
