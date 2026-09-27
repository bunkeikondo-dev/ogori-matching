# おごり自販機マッチングシステム（Vercel + Supabase 版）

社内コミュニケーション活性化を目的とした、リアルタイムマッチングシステム（PoC）です。
このリポジトリは **Vercel（ホスティング）+ Supabase（DB・Realtime）** で動かすことを前提に、
元のDocker版（Next.js custom server + Socket.IO + SQLite）から構成を変更したものです。

## Docker版との違い（重要）

Vercelは「常時起動のサーバー」を持てないサーバーレス環境です。そのため次のように置き換えています。

| 役割 | Docker版 | 本バージョン |
| --- | --- | --- |
| リアルタイム通信 | Socket.IO | **Supabase Realtime**（ブラウザがSupabaseへ直接接続） |
| データベース | SQLite（ファイル） | **Supabase Postgres** |
| 排他制御 | プロセス内ロック | **Postgresのアドバイザリロック** |
| 定期処理（日次リセット） | `setInterval` | **Vercel Cron**（`vercel.json`） |
| ブラウザ離脱検知 | WebSocket切断 | `navigator.sendBeacon` + サーバー側の期限切れ判定 |
| 起動方法 | `docker compose up` | `vercel deploy`（Gitプッシュで自動デプロイも可） |

詳しい設計判断は [`docs/DESIGN.md`](docs/DESIGN.md) を参照してください。

**既知の制約（PoCとして許容している点）**

- Vercel Hobby（無料）プランはCronの実行頻度が「1日1回」までです。本システムの日次リセットは
  ちょうど1日1回のため問題ありませんが、それ以上の頻度でサーバー側の定期処理をしたい場合は
  Proプラン、または Supabase の `pg_cron` を検討してください。
- `entryId`（ランダムな文字列）を知っている人だけが自分のマッチ結果を受け取れる設計です。ログイン
  機能がある本格的なシステムほど厳密ではありません。
- タブを閉じたときの離脱通知は `sendBeacon` を使いますが、100%ではありません（ブラウザクラッシュ
  等では届きません）。その場合も、待機期限（最大5分）が来れば自動的にキューから外れます。

## 事前に必要なもの

1. **Supabaseアカウント**（無料枠あり）と、新規プロジェクト
2. **Vercelアカウント**（無料枠あり）とGitリポジトリ（GitHub等）
3. Node.js 20以上（ローカルで動作確認する場合）

## セットアップ手順

### 1. Supabaseプロジェクトを作成する

1. https://supabase.com でプロジェクトを新規作成します（リージョンは `ap-northeast-1`（東京）等、
   利用者に近い場所を推奨）。
2. **Settings → Database → Connection string** から、以下の2つを控えます。
   - Transaction pooler（ポート **6543**）: `?pgbouncer=true&connection_limit=1` を末尾に付ける
   - Direct connection（ポート **5432**）
3. **Settings → API** から、`Project URL`・`anon public` キー・`service_role` キーを控えます。
   `service_role` キーは強い権限を持つため、**サーバー側の環境変数にのみ**設定し、絶対にブラウザに
   渡さないでください（`NEXT_PUBLIC_` を付けないこと）。

### 2. 環境変数を設定する

```bash
cp .env.example .env
```

`.env` を開き、上記で控えた値と `ADMIN_PASSCODE` などを設定します。

### 3. マイグレーション適用 + 初期データ投入（ローカルから実行）

```bash
npm install
npm run setup   # prisma generate → prisma migrate deploy → seed（トークテーマ20件）
```

### 4. ローカルで動作確認

```bash
npm run dev
```

http://localhost:3000 にアクセスします。管理画面は http://localhost:3000/admin です。

> 受付時間（平日 9:00〜15:00 JST）外に確認する場合は `.env` の `IGNORE_BUSINESS_HOURS=true` を
> 設定してください。

### 5. Vercelへデプロイする

1. このリポジトリをGitHub等にプッシュします。
2. Vercelで「Add New Project」からリポジトリを選択します（Frameworkは自動的にNext.jsと認識されます）。
3. Vercelプロジェクトの **Settings → Environment Variables** に、`.env` と同じ内容
   （`DATABASE_URL` / `DIRECT_URL` / `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` /
   `SUPABASE_SERVICE_ROLE_KEY` / `ADMIN_PASSCODE` / `ADMIN_SESSION_SECRET` / `COOKIE_SECURE=true` /
   `CRON_SECRET` / 受付時間関連）を設定します。
4. **Deploy** を押します。ビルド時に `prisma generate` が走ります
   （マイグレーション自体は事前にローカルから `npm run setup` 済みである前提です。初回のみ）。
5. デプロイ後、Vercelの **Settings → Cron Jobs** に `vercel.json` の内容が反映されていることを
   確認してください（`/api/cron/daily-reset` が毎日 15:00 UTC = 00:00 JST に実行されます）。

以降はGitにプッシュするたびに自動で再デプロイされます。

## ディレクトリ構成

```
.
├── vercel.json                 # Vercel Cron設定（日次リセット）
├── prisma/
│   ├── schema.prisma            # Prisma Schema（PostgreSQL）
│   ├── migrations/               # マイグレーション
│   └── seed.ts                   # Seeder（トークテーマ20件）
├── src/
│   ├── app/
│   │   ├── api/queue/{join,leave,status,timeout-check}/   # 参加者向けAPI
│   │   ├── api/cron/daily-reset/                           # Vercel Cron
│   │   ├── api/admin/                                       # 管理画面API
│   │   └── admin/ , page.tsx                                 # 画面
│   ├── components/               # 参加者向けUI / 管理画面UI
│   ├── lib/                      # 型・検証・時刻・APIクライアント・Supabaseブラウザクライアント
│   └── server/                   # マッチングロジック・認証・Realtime配信・Cron認証
└── docs/DESIGN.md                # システム構成図 / ER図 / 画面遷移図 / API一覧
```

## 環境変数

| 変数 | 説明 |
| --- | --- |
| `DATABASE_URL` | Supabase Transaction Pooler接続文字列（ポート6543、`?pgbouncer=true&connection_limit=1`付き） |
| `DIRECT_URL` | Supabase直接接続文字列（ポート5432、マイグレーション用） |
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトURL（ブラウザに公開されます） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonキー（ブラウザに公開されます） |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service roleキー（**サーバー専用・非公開**） |
| `ADMIN_PASSCODE` | 管理画面のパスコード |
| `ADMIN_SESSION_SECRET` | 管理画面セッションCookieの署名キー |
| `COOKIE_SECURE` | Vercel（HTTPS）では `true` を設定 |
| `CRON_SECRET` | Vercel Cronの認証に使う秘密文字列（自分で生成してVercelとローカルの両方に設定） |
| `OPEN_HOUR` / `CLOSE_HOUR` | 受付開始・終了時刻（JST） |
| `BUSINESS_DAYS` | 受付曜日（0=日〜6=土） |
| `WAIT_SECONDS` | 待機タイムアウト秒数 |
| `IGNORE_BUSINESS_HOURS` | `true`で受付時間・曜日判定を無効化（動作確認用） |
| `SEED_FORCE` | `true`で既存データがあっても初期テーマを再投入 |

## 料金の目安

- **Vercel**: Hobby（無料）プランで動作します。ただしCronは1日1回までなので、この構成（日次リセットのみ）
  ならHobbyで十分です。
- **Supabase**: Freeプランで動作します（一定期間アクセスがないと一時停止する場合があるためご注意
  ください）。本番相当で使うならProプラン（月$25程度、要最新価格確認）を推奨します。

料金プランは変わることがあるため、契約前に両サービスの公式料金ページで最新情報を確認してください。

## 仕様の実装メモ（Docker版からの主な変更点）

- **マッチング**: ロジック自体はDocker版と同じ（先着順・単一トランザクション）ですが、直列化を
  プロセス内ロックではなく `pg_advisory_xact_lock`（Postgres側のロック）で行います。これにより
  Vercelの複数インスタンスが同時に動いても安全に直列化されます。
- **リアルタイム表示**: 待機人数は `queue-status` チャンネルへの全体配信、マッチ成立・取り消しは
  `entry-{entryId}` という個人向けチャンネルへの配信で実現します。マッチ成立の瞬間、自分自身の
  結果はAPIレスポンスとしてその場で受け取り、他のメンバーにはRealtime経由で届きます。
- **タイムアウト**: 待機画面のカウントダウンが0になった時点で、クライアントが
  `/api/queue/timeout-check` を呼び出してサーバー側でも期限切れを確認します。1秒毎の常時監視は
  行いませんが、待機人数・マッチ候補の集計では期限切れ行を常に除外しているため、正確性には
  影響しません。
- **離脱検知**: `navigator.sendBeacon` を使い、タブを閉じる・リロードする瞬間に離脱APIを呼びます。
  確実性はSocket.IOの切断検知に劣りますが、届かなかった場合も待機期限（最大5分）で自然に解消します。
- **管理画面ログインのレート制限**: サーバーレスでは複数インスタンスがメモリを共有できないため、
  `LoginAttempt` テーブル（Postgres）で管理します。

## トラブルシューティング

- **`P1001: Can't reach database server`**: `DATABASE_URL`/`DIRECT_URL` のホスト名・ポート・パスワード
  を確認してください。マイグレーション（`prisma migrate deploy`）は直接接続（5432）、アプリの実行時
  クエリはTransaction Pooler（6543）を使う必要があります。
- **管理画面にログインできない**: Vercelの環境変数に `ADMIN_PASSCODE` が設定されているか確認してくだ
  さい。5回連続で失敗すると10分間ブロックされます（`LoginAttempt`テーブルで確認できます）。
- **待機人数やマッチ成立がリアルタイムに表示されない**: `NEXT_PUBLIC_SUPABASE_URL` /
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` がVercel側に設定されているか、Supabaseダッシュボードで
  Realtimeが有効になっているか確認してください。
- **日次リセットが実行されない**: Vercelの **Settings → Cron Jobs** に登録されているか、
  `CRON_SECRET` が正しく設定されているか確認してください。手動確認は
  `curl -H "Authorization: Bearer <CRON_SECRET>" https://<your-app>.vercel.app/api/cron/daily-reset`
  で行えます。

詳細な設計資料（構成図・ER図・画面遷移図・API一覧）は [`docs/DESIGN.md`](docs/DESIGN.md) を参照してください。
