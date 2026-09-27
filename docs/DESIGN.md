# 設計資料（Vercel + Supabase 版）

Docker版との最大の違いは「常時起動のNode.jsサーバーを持たない」ことです。
Vercelはリクエストが来た瞬間だけ関数を起動する**サーバーレス**環境のため、Socket.IOのような
「接続を張りっぱなしにするサーバー」は使えません。この版では、

- リアルタイム配信 → **Supabase Realtime**（クライアントがSupabaseへ直接WebSocket接続）
- 排他制御（同時参加の直列化） → **Postgresのアドバイザリロック**（`pg_advisory_xact_lock`）
- 定期処理（日次リセット） → **Vercel Cron**
- 離脱検知 → **`navigator.sendBeacon` + サーバー側の期限切れ判定**

に置き換えています。

## 1. システム構成図

```mermaid
flowchart LR
  subgraph Browser["ブラウザ"]
    UI["Next.js UI (React / Tailwind)"]
    RT["Supabase Realtime Client<br/>(@supabase/supabase-js)"]
  end

  subgraph Vercel["Vercel (サーバーレス)"]
    API["Next.js Route Handlers<br/>/api/queue/*, /api/admin/*"]
    CRON["Vercel Cron<br/>/api/cron/daily-reset (毎日 00:00 JST)"]
  end

  subgraph Supabase["Supabase"]
    PG[("Postgres<br/>Prisma経由でアクセス")]
    RTS["Realtime<br/>Broadcast"]
  end

  UI -- "HTTP (参加登録・キャンセル・受付状況)" --> API
  RT <-- "WebSocket (待機人数・マッチ結果・取消通知)" --> RTS
  API -- "Prisma (Transaction Pooler:6543)" --> PG
  API -- "service role keyで配信" --> RTS
  CRON --> API
```

## 2. ER図

```mermaid
erDiagram
  MatchGroup ||--o{ QueueEntry : "含む"

  MatchGroup {
    string id PK
    int matchSize "2 or 4"
    string themeText
    datetime createdAt
  }

  QueueEntry {
    string id PK
    string token "本人確認用の秘密トークン"
    string name
    string department
    string contactType "TEAMS or EXTENSION"
    string contactValue
    int matchSize "2 or 4"
    string status "WAITING or MATCHED"
    datetime joinedAt
    datetime expiresAt
    string matchGroupId FK
  }

  TalkTheme {
    int id PK
    string text UK
    datetime createdAt
    datetime updatedAt
  }

  DailyStat {
    string date PK "JSTのYYYY-MM-DD"
    int twoMatchCount
    int fourMatchCount
  }

  LoginAttempt {
    string ip PK
    int count
    datetime resetAt
  }
```

> Docker版にあった `socketId` 列は不要になりました（接続の生存確認をSocket.IOに頼らないため）。
> 代わりに `LoginAttempt` テーブルを追加しています（サーバーレスはプロセスをまたぐため、ログイン試行回数をメモリではなくDBで管理する必要があるため）。

## 3. 画面遷移図

```mermaid
flowchart TD
  START(["アクセス /"]) --> LOAD["読み込み中"]
  LOAD -->|"成立済みセッションあり"| MATCHED
  LOAD -->|"受付時間内"| FORM["参加登録画面"]
  LOAD -->|"受付時間外"| CLOSED["受付時間外画面"]
  CLOSED -->|"09:00 到達（自動切替）"| FORM
  FORM -->|"15:00 到達（自動切替）"| CLOSED

  FORM -->|"参加する（POST /api/queue/join・エラー）"| FORM
  FORM -->|"参加する（成功・即成立）"| MATCHED["マッチ成立画面"]
  FORM -->|"参加する（成功・待機）"| WAIT["待機画面<br/>カウントダウン 05:00〜"]

  WAIT -->|"他者の参加でRealtime配信を受信"| MATCHED
  WAIT -->|"カウントダウンが0→POST /api/queue/timeout-check"| TIMEOUT["タイムアウト画面"]
  WAIT -->|"キャンセル（POST /api/queue/leave）"| FORM
  WAIT -->|"管理者による削除 / 日次リセット（Realtime配信）"| CANCELLED["キャンセル通知画面"]
  WAIT -->|"タブ終了・リロード・離脱（sendBeacon）"| LEFT(["キューから削除"])

  TIMEOUT -->|"再度参加する"| FORM
  CANCELLED -->|"再度参加する"| FORM
  MATCHED -->|"トップに戻る"| FORM
  MATCHED -->|"Teamsチャットを開く（全員Teamsのみ）"| TEAMS(["Teams"])

  FORM -->|"管理画面"| ALOGIN["管理画面ログイン"]
  CLOSED -->|"管理画面"| ALOGIN
  ALOGIN -->|"パスコード認証成功"| ADMIN["管理画面"]
  ALOGIN -->|"認証失敗"| ALOGIN
  ADMIN -->|"ログアウト"| ALOGIN
```

## 4. マッチング成立時のシーケンス

```mermaid
sequenceDiagram
  participant A as 参加者A（待機中）
  participant B as 参加者B（今から参加）
  participant API as /api/queue/join (Vercel)
  participant PG as Supabase Postgres
  participant RT as Supabase Realtime

  B->>API: POST /api/queue/join
  API->>PG: pg_advisory_xact_lock 取得 → 重複確認 → INSERT → 候補検索
  PG-->>API: 2人（4人）分そろった
  API->>PG: MatchGroup作成 + 該当行をMATCHEDに更新 + 成立件数加算（同一トランザクション）
  API->>RT: entry-{Aのid} チャンネルへ broadcast("match", ...)
  API-->>B: HTTPレスポンス（自分向けのmatch結果を直接返す）
  RT-->>A: 待機画面が購読中のチャンネルにmatchイベント到着 → マッチ成立画面へ
```

## 5. API一覧

| メソッド | パス | 認証 | 概要 |
| --- | --- | --- | --- |
| GET | `/api/health` | 不要 | ヘルスチェック（DB疎通確認） |
| GET | `/api/service-status` | 不要 | 受付中/時間外の判定結果 |
| GET | `/api/queue/status` | 不要 | 待機人数（2人 / 4人） |
| POST | `/api/queue/join` | 不要 | 参加登録（Socket.IO版の`queue:join`相当） |
| POST | `/api/queue/leave` | 本人トークン | 待機キャンセル・離脱通知（`sendBeacon`からも呼ばれる） |
| POST | `/api/queue/timeout-check` | 本人トークン | 待機カウントダウン0時のサーバー側期限確認 |
| GET | `/api/match/result?entryId=&token=` | 本人トークン | 成立済みマッチ結果の再取得 |
| POST | `/api/admin/login` | 不要 | パスコード認証・セッションCookie発行 |
| POST | `/api/admin/logout` | 不要 | セッションCookie破棄 |
| GET | `/api/admin/session` | 不要 | ログイン状態の確認 |
| GET | `/api/admin/dashboard` | 管理者 | 待機一覧・待機人数・当日成立件数 |
| DELETE | `/api/admin/queue` | 管理者 | 全待機データ削除（緊急機能） |
| GET/POST | `/api/admin/themes` | 管理者 | トークテーマ一覧・追加 |
| PUT/DELETE | `/api/admin/themes/:id` | 管理者 | トークテーマ編集・削除 |
| GET/POST | `/api/cron/daily-reset` | `CRON_SECRET` | 日次リセット（Vercel Cronから毎日 15:00 UTC = 00:00 JST に起動） |

## Supabase Realtime チャンネル

| チャンネル | イベント | 配信範囲 | 概要 |
| --- | --- | --- | --- |
| `queue-status` | `status` | 全員 | `{ two, four }` 待機人数のみ（個人情報なし） |
| `entry-{entryId}` | `match` | 本人のみ（購読者がentryIdを知っている前提） | マッチ成立時に他メンバーへ配信するMatchResult |
| `entry-{entryId}` | `cancelled` | 本人のみ | 管理者削除・日次リセットによる取り消し通知 |

`entryId`（cuid）は第三者が推測できない前提のPoC設計です。より厳格にするなら、Supabase Realtimeの
Authorization機能（チャンネルごとのアクセス制御）を追加してください。

## 6. サーバーレス特有の設計判断

| 項目 | Docker版 | Vercel + Supabase版 |
| --- | --- | --- |
| 排他制御 | プロセス内Promiseチェーン | Postgres `pg_advisory_xact_lock`（DB側で直列化） |
| リアルタイム配信 | Socket.IO（同一サーバー内） | Supabase Realtime Broadcast |
| 離脱検知 | WebSocket `disconnect` | `navigator.sendBeacon` + 期限切れによる自然消滅 |
| タイムアウト監視 | 1秒毎のインターバル | クライアント側カウントダウン0時にサーバー確認（`/api/queue/timeout-check`） |
| 日次リセット | `setInterval`で日付跨ぎを検知 | Vercel Cron（`vercel.json`、毎日1回） |
| 管理画面ログインのレート制限 | プロセス内Map | `LoginAttempt`テーブル（Postgres） |

### なぜ「1秒毎の監視」をやめてよいのか

`getQueueStatus` と `getDashboard` は `expiresAt > now` の行だけを数えるようにしているため、
期限切れの行がDBに残っていても、待機人数・マッチング候補には一切影響しません。
そのため、期限切れ行の物理的な削除は「毎日1回のお掃除」で十分です（Vercel Hobbyプランの
Cron頻度が1日1回までに制限されていることとも相性が良い設計です）。
本人の待機画面のカウントダウンは、0になった瞬間にクライアントから
`/api/queue/timeout-check` を呼び、その場でサーバーに確認しています。
