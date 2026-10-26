-- セキュリティ強化: 全テーブルで Row Level Security (RLS) を有効化する。
--
-- 背景: このアプリは Prisma から DATABASE_URL（管理者権限の接続）で直接 Postgres に
-- アクセスしており、ブラウザは Supabase の anon キーで Realtime の broadcast チャンネル
-- （待機人数の配信・マッチ結果の個別配信）だけを使う設計で、テーブルを直接読み書きすることは
-- 一切ない。
--
-- しかし Supabase は、テーブルを作成すると既定で PostgREST 経由の REST API
-- （https://<project>.supabase.co/rest/v1/<table>）を自動的に公開する仕様になっており、
-- RLSを有効化していないテーブルは、ブラウザに公開される前提の anon キーさえあれば
-- 誰でも直接読み書きできてしまう（2026年4月28日以降、新規プロジェクトではこの既定の
-- 自動公開が段階的に廃止されているが、既存プロジェクトへの適用は2026年10月30日であり、
-- 確実な対策として明示的にRLSを有効化しておく）。
--
-- Prisma が使う接続（postgres ロール等の管理者権限）は RLS の対象外（bypassrls）のため、
-- 以下を適用してもアプリの動作には一切影響しない。

ALTER TABLE "QueueEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MatchGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TalkTheme" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyStat" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoginAttempt" ENABLE ROW LEVEL SECURITY;

-- ポリシーを1つも追加しないため、RLS有効化だけで anon / authenticated ロールからの
-- 全アクセスが拒否される（deny-all）。念のため、明示的にも権限を剥奪しておく
-- （将来誰かが誤ってポリシーやRLSを無効化してしまった場合の保険）。
REVOKE ALL ON TABLE "QueueEntry" FROM anon, authenticated;
REVOKE ALL ON TABLE "MatchGroup" FROM anon, authenticated;
REVOKE ALL ON TABLE "TalkTheme" FROM anon, authenticated;
REVOKE ALL ON TABLE "DailyStat" FROM anon, authenticated;
REVOKE ALL ON TABLE "LoginAttempt" FROM anon, authenticated;
