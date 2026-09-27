import type { NextRequest } from 'next/server';

/**
 * Vercel Cronからの呼び出しであることを確認する。
 * Vercelプロジェクトの環境変数に CRON_SECRET を設定すると、Vercelがcron実行時に
 * `Authorization: Bearer <CRON_SECRET>` を自動付与する（Vercel公式ドキュメント準拠）。
 */
export function isAuthorizedCronRequest(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // CRON_SECRET未設定の環境（ローカル動作確認等）では手動実行を許可する。
    // 本番運用では必ず設定すること。
    return process.env.NODE_ENV !== 'production';
  }
  return request.headers.get('authorization') === `Bearer ${secret}`;
}
