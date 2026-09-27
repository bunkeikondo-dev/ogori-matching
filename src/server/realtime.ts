import {
  ENTRY_CANCELLED_EVENT,
  ENTRY_MATCH_EVENT,
  entryChannelName,
  QUEUE_STATUS_CHANNEL,
  QUEUE_STATUS_EVENT,
} from '@/lib/realtime-channels';
import type { MatchResult } from '@/lib/types';
import { getQueueStatus } from './queue-service';
import { getSupabaseAdmin } from './supabase-admin';

/**
 * Supabase Realtimeのbroadcastでイベントを送る。
 * Supabaseが未設定（ローカルでキー未設定など）の場合は静かに諦める
 * （REST API自体は正常に完了させ、リアルタイム更新だけが効かない状態にする）。
 */
async function send(channelName: string, event: string, payload: unknown): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    console.warn('[realtime] Supabaseの接続情報が未設定のため、配信をスキップしました。');
    return;
  }
  const channel = admin.channel(channelName);
  try {
    await channel.send({ type: 'broadcast', event, payload });
  } catch (error) {
    console.error(`[realtime] 配信に失敗しました (channel=${channelName}, event=${event})`, error);
  } finally {
    await admin.removeChannel(channel);
  }
}

/** 待機人数（全体配信・個人情報なし） */
export async function broadcastQueueStatus(): Promise<void> {
  try {
    const status = await getQueueStatus();
    await send(QUEUE_STATUS_CHANNEL, QUEUE_STATUS_EVENT, status);
  } catch (error) {
    console.error('[realtime] 待機人数の配信に失敗しました。', error);
  }
}

/** 成立をentryId個別チャンネルへ配信（同一マッチグループ内の他メンバー向け） */
export async function broadcastMatchToEntry(entryId: string, result: MatchResult): Promise<void> {
  await send(entryChannelName(entryId), ENTRY_MATCH_EVENT, result);
}

/** 取り消し（管理者削除・日次リセット）をentryId個別チャンネルへ配信 */
export async function broadcastCancelledToEntry(entryId: string, message: string): Promise<void> {
  await send(entryChannelName(entryId), ENTRY_CANCELLED_EVENT, { message });
}

export async function broadcastCancelledToEntries(entryIds: string[], message: string): Promise<void> {
  await Promise.all(entryIds.map((entryId) => broadcastCancelledToEntry(entryId, message)));
}
