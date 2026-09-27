/** Supabase Realtimeのチャンネル名・イベント名を一箇所で管理する（クライアント/サーバー共通） */

/** 待機人数（全体配信・個人情報なし） */
export const QUEUE_STATUS_CHANNEL = 'queue-status';
export const QUEUE_STATUS_EVENT = 'status';

/**
 * 個人向けチャンネル。entryId は cuid でランダム性があり第三者から推測できないため、
 * 「entryId を知っている本人のブラウザだけが購読する」という前提で個人情報を配信する。
 * これはPoCとしての設計判断であり、Supabase RealtimeのAuthorization機能（有料/追加設定）を
 * 使えばチャンネル単位での厳格なアクセス制御も可能。
 */
export function entryChannelName(entryId: string): string {
  return `entry-${entryId}`;
}

export const ENTRY_MATCH_EVENT = 'match';
export const ENTRY_CANCELLED_EVENT = 'cancelled';
