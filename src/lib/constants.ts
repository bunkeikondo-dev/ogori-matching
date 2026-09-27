export const APP_TITLE = 'おごり自販機マッチング';
export const TEAMS_DOMAIN = 'bunkei.co.jp';
export const EVENT_DATE_TEXT = '本日15:00';
export const EVENT_PLACE = 'おごり自販機前';

export const STATUS = {
  WAITING: 'WAITING',
  MATCHED: 'MATCHED',
} as const;

/** REST APIのパス（Vercel + Supabase版。Socket.IOイベントの代わりにHTTPエンドポイントを使う） */
export const API_ROUTES = {
  JOIN: '/api/queue/join',
  LEAVE: '/api/queue/leave',
  TIMEOUT_CHECK: '/api/queue/timeout-check',
  STATUS: '/api/queue/status',
  SERVICE_STATUS: '/api/service-status',
  MATCH_RESULT: '/api/match/result',
} as const;

export const DUPLICATE_MESSAGE =
  '既にマッチング待機中です。\nマッチ成立またはタイムアウト後に再度お申し込みください。';

export const TEAMS_DOMAIN_WARNING =
  'ドメインは自動付与されます。\nユーザーIDのみ入力してください。';

export const TEAMS_GUIDE =
  '※ Teamsチャットを開いた後、最初にどなたか1名がメッセージを送信してください。';

export const MATCH_NOTICE =
  '※ マッチ成立後は、参加者同士で事前に連絡を取り合い、業務都合による欠席や遅刻がある場合は必ず相手へご連絡ください。';

export const FALLBACK_THEME = '最近、業務で便利だと感じたツールや機能はありますか？';

export const ADMIN_COOKIE = 'admin_session';
export const ADMIN_SESSION_HOURS = 8;

export const THEME_MAX_LENGTH = 200;
export const TEXT_MAX_LENGTH = 50;
