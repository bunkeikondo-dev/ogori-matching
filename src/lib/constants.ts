export const APP_TITLE = 'おごり自販機マッチング';
export const TEAMS_DOMAIN = 'bunkei.co.jp';

export const STATUS = {
  WAITING: 'WAITING',
  MATCHED: 'MATCHED',
} as const;

/** 拠点（マッチングシステムの種類）。参加者のプール（キュー）は拠点ごとに完全に独立している。 */
export const SITES = ['gifu', 'tokyo', 'naibu'] as const;

export const SITE_LABELS: Record<(typeof SITES)[number], string> = {
  gifu: '岐阜用',
  tokyo: '東京用',
  naibu: '部内用',
};

export const SITE_DESCRIPTIONS: Record<(typeof SITES)[number], string> = {
  gifu: '岐阜拠点のメンバー同士でマッチングします。',
  tokyo: '東京拠点のメンバー同士でマッチングします。',
  naibu: '部内のメンバー同士でマッチングします（2人マッチのみ）。',
};

/** 拠点ごとに選べるマッチ人数。部内用は4人マッチを提供しない。 */
export const SITE_MATCH_SIZES: Record<(typeof SITES)[number], readonly (2 | 4)[]> = {
  gifu: [2, 4],
  tokyo: [2, 4],
  naibu: [2],
};

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

/** 日時・集合場所は固定せず、参加者同士で相談して決める運用 */
export const COORDINATE_NOTICE = '※ 日時・集合方法は、参加者同士でご相談のうえ決めてください。';

export const FALLBACK_LIGHT_THEME = '最近、仕事でちょっと嬉しかったことはありますか？';
export const FALLBACK_DEEP_THEME = 'これまでの仕事でうまくいった経験と、その成功につながったポイントを教えてください。';

export const ADMIN_COOKIE = 'admin_session';
export const ADMIN_SESSION_HOURS = 8;

export const THEME_MAX_LENGTH = 200;
export const TEXT_MAX_LENGTH = 50;
