export type ContactType = 'TEAMS' | 'EXTENSION';
export type MatchSize = 2 | 4;

/** フォームの入力値（生データ） */
export interface JoinFormValues {
  name: string;
  department: string;
  contactType: ContactType;
  teamsId: string;
  extension: string;
  matchSize: MatchSize;
}

/** バリデーション・正規化後の参加入力 */
export interface JoinInput {
  name: string;
  department: string;
  contactType: ContactType;
  /** TEAMS: メールアドレス（小文字・ドメイン付与済み） / EXTENSION: 内線番号 */
  contactValue: string;
  matchSize: MatchSize;
}

export type JoinField =
  | 'name'
  | 'department'
  | 'contactType'
  | 'teamsId'
  | 'extension'
  | 'matchSize';

export type FieldErrors = Partial<Record<JoinField, string>>;

export interface QueueStatus {
  two: number;
  four: number;
}

export interface MatchMember {
  name: string;
  department: string;
  contactType: ContactType;
  contactValue: string;
  isSelf: boolean;
}

export interface MatchResult {
  matchId: string;
  matchSize: MatchSize;
  themeText: string;
  members: MatchMember[];
  /** 全員がTeams利用者の場合のみ設定 */
  teamsLink: string | null;
}

export type JoinErrorCode = 'VALIDATION' | 'DUPLICATE' | 'CLOSED' | 'INTERNAL';

/** POST /api/queue/join のレスポンス形。Socket.IO版のACKと同じ形を踏襲している */
export type JoinAck =
  | {
      ok: true;
      entryId: string;
      token: string;
      matchSize: MatchSize;
      /** 待機期限（エポックms） */
      expiresAt: number;
      /** サーバー現在時刻（エポックms）。クライアントとの時計ずれ補正に使用 */
      serverNow: number;
      /** 参加により即時成立した場合のみ設定 */
      match: MatchResult | null;
    }
  | {
      ok: false;
      code: JoinErrorCode;
      message: string;
      fieldErrors?: FieldErrors;
    };

export interface LeaveAck {
  ok: boolean;
}

/** POST /api/queue/timeout-check のレスポンス形 */
export type TimeoutCheckResult =
  | { expired: true }
  | { expired: false; match: MatchResult };

export interface CancelledPayload {
  message: string;
}

export type ClosedReason = 'BEFORE_OPEN' | 'AFTER_CLOSE' | 'NON_BUSINESS_DAY';

export interface ServiceStatus {
  open: boolean;
  reason: ClosedReason | null;
  openHour: number;
  closeHour: number;
}

export interface AdminWaitingEntry {
  id: string;
  name: string;
  department: string;
  contactType: ContactType;
  contactValue: string;
  matchSize: MatchSize;
  joinedAt: string;
}

export interface AdminDashboardData {
  waiting: AdminWaitingEntry[];
  waitingCounts: QueueStatus;
  today: { date: string; two: number; four: number };
  serverTime: string;
}

export interface TalkThemeDto {
  id: number;
  text: string;
  createdAt: string;
  updatedAt: string;
}
