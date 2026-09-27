'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/**
 * ブラウザ用Supabaseクライアント（anonキーのみ使用。DBには直接アクセスせずRealtimeの購読にのみ使う）
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      throw new Error('Supabaseの接続情報が設定されていません。NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY を確認してください。');
    }
    client = createClient(url, anonKey, {
      realtime: { params: { eventsPerSecond: 5 } },
    });
  }
  return client;
}
