import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * サーバー専用Supabaseクライアント（service role key使用）。
 * 'use client' コンポーネントから絶対にimportしないこと（キーがブラウザに露出する）。
 * Realtimeへのブロードキャスト配信にのみ使用し、DBアクセスはPrisma経由で行う。
 */
const globalForSupabase = globalThis as unknown as { __ogoriSupabaseAdmin?: SupabaseClient };

function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return null;
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (globalForSupabase.__ogoriSupabaseAdmin) {
    return globalForSupabase.__ogoriSupabaseAdmin;
  }
  const client = createAdminClient();
  if (client) {
    globalForSupabase.__ogoriSupabaseAdmin = client;
  }
  return client;
}
