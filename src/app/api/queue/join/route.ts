import { errorResponse, jsonResponse, readJson, route } from '@/server/http';
import { buildMatchResult, joinQueue } from '@/server/queue-service';
import { broadcastMatchToEntry, broadcastQueueStatus } from '@/server/realtime';
import { validateJoinInput } from '@/lib/validation';
import type { JoinAck } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const INTERNAL_ERROR_MESSAGE = 'サーバーエラーが発生しました。時間をおいて再度お試しください。';

/** 参加登録（旧Socket.IO版の queue:join に相当） */
export const POST = route(async (request) => {
  const body = await readJson(request);
  const validation = validateJoinInput(body);
  if (!validation.ok) {
    const ack: JoinAck = {
      ok: false,
      code: 'VALIDATION',
      message: '入力内容を確認してください。',
      fieldErrors: validation.errors,
    };
    return jsonResponse(ack, 400);
  }

  try {
    const now = new Date();
    const result = await joinQueue(validation.data, now);
    if (!result.ok) {
      const ack: JoinAck = { ok: false, code: result.code, message: result.message };
      return jsonResponse(ack, result.code === 'CLOSED' ? 409 : 409);
    }

    // 成立時: 自分以外のメンバーには、各自のentryId専用チャンネルへ配信する
    let ownMatch = null;
    if (result.match) {
      for (const member of result.match.members) {
        const view = buildMatchResult(result.match, member.id);
        if (member.id === result.entry.id) {
          ownMatch = view;
        } else {
          await broadcastMatchToEntry(member.id, view);
        }
      }
    }

    const ack: JoinAck = {
      ok: true,
      entryId: result.entry.id,
      token: result.entry.token,
      matchSize: result.entry.matchSize,
      expiresAt: result.entry.expiresAt.getTime(),
      serverNow: Date.now(),
      match: ownMatch,
    };

    await broadcastQueueStatus();
    return jsonResponse(ack);
  } catch (error) {
    console.error('[api/queue/join] 参加処理に失敗しました。', error);
    const ack: JoinAck = { ok: false, code: 'INTERNAL', message: INTERNAL_ERROR_MESSAGE };
    return errorResponse(ack.message, 500, { code: ack.code });
  }
});
