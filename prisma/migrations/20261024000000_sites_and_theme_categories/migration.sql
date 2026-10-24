-- 拠点別マッチング（岐阜/東京/部内）とトークテーマのカテゴリ分け（ライト/じっくり）への対応。
-- このシステムはまだ本番稼働前のため、既存のトークテーマ（旧20件）は一旦削除し、
-- アプリ起動後の seed（prisma/seed.ts）で新しい42件（ライト21 + じっくり21）を投入し直す想定です。
-- 既に本番データが入っている場合は、適用前に必ずバックアップを取得してください。

-- TalkTheme: category列を追加
ALTER TABLE "TalkTheme" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'DEEP';
ALTER TABLE "TalkTheme" ALTER COLUMN "category" DROP DEFAULT;
CREATE INDEX "TalkTheme_category_idx" ON "TalkTheme"("category");
-- 旧テーマ（カテゴリ分け前のもの）をクリアし、seedで新データを投入し直す
DELETE FROM "TalkTheme";

-- QueueEntry: site列を追加（既存行があれば一旦'gifu'を割り当てたうえでNOT NULL化）
ALTER TABLE "QueueEntry" ADD COLUMN "site" TEXT NOT NULL DEFAULT 'gifu';
ALTER TABLE "QueueEntry" ALTER COLUMN "site" DROP DEFAULT;
DROP INDEX IF EXISTS "QueueEntry_status_matchSize_joinedAt_idx";
DROP INDEX IF EXISTS "QueueEntry_status_expiresAt_idx";
CREATE INDEX "QueueEntry_site_status_matchSize_joinedAt_idx" ON "QueueEntry"("site", "status", "matchSize", "joinedAt");
CREATE INDEX "QueueEntry_site_status_expiresAt_idx" ON "QueueEntry"("site", "status", "expiresAt");

-- MatchGroup: site列・ライト/じっくりテーマ列を追加し、旧themeText列を削除
ALTER TABLE "MatchGroup" ADD COLUMN "site" TEXT NOT NULL DEFAULT 'gifu';
ALTER TABLE "MatchGroup" ALTER COLUMN "site" DROP DEFAULT;
ALTER TABLE "MatchGroup" ADD COLUMN "lightThemeText" TEXT NOT NULL DEFAULT '';
ALTER TABLE "MatchGroup" ALTER COLUMN "lightThemeText" DROP DEFAULT;
ALTER TABLE "MatchGroup" ADD COLUMN "deepThemeText" TEXT NOT NULL DEFAULT '';
ALTER TABLE "MatchGroup" ALTER COLUMN "deepThemeText" DROP DEFAULT;
ALTER TABLE "MatchGroup" DROP COLUMN "themeText";

-- DailyStat: 複合主キー(date, site)に変更
ALTER TABLE "DailyStat" DROP CONSTRAINT "DailyStat_pkey";
ALTER TABLE "DailyStat" ADD COLUMN "site" TEXT NOT NULL DEFAULT 'gifu';
ALTER TABLE "DailyStat" ALTER COLUMN "site" DROP DEFAULT;
ALTER TABLE "DailyStat" ADD CONSTRAINT "DailyStat_pkey" PRIMARY KEY ("date", "site");
