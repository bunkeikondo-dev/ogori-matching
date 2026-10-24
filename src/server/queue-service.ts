import crypto from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { DUPLICATE_MESSAGE, FALLBACK_DEEP_THEME, FALLBACK_LIGHT_THEME, STATUS } from '@/lib/constants';
import { prisma } from '@/lib/prisma';
import { getJstDateString, getJstStartOfDay } from '@/lib/time';
import type {
  AdminDashboardData,
  ContactType,
  JoinInput,
  MatchMember,
  MatchResult,
  MatchSize,
  QueueStatus,
  Site,
} from '@/lib/types';
import { getServiceConfig } from './config';
import { getCloseAt, getServiceStatus } from './service-hours';

/**
 * キュー操作の直列化。
 * サーバーレス環境では複数の実行インスタンスが同時に動くため、プロセス内ミューテックスでは
 * 排他制御にならない。Postgresのトランザクション内アドバイザリロックでDB側に直列化させる。
 * キーは本アプリ専用の固定値（64bit整数）。拠点（site）をまたいでも衝突しないロックキーに
 * する必要はない：同時に処理されても拠点が違えばお互いに干渉しないロジックだが、
 * シンプルさを優先して全拠点共通の1本のロックで直列化している（拠点を増やしても性能上の
 * 問題が出るような負荷は想定していないため）。
 */
const QUEUE_LOCK_KEY = 84512001n;

type Tx = Prisma.TransactionClient;

async function withQueueLock<T>(task: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${QUEUE_LOCK_KEY})`;
      return task(tx);
    },
    { timeout: 15000, maxWait: 15000 },
  );
}

function safeEqualLocal(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export interface MemberRow {
  id: string;
  name: string;
  department: string;
  contactType: ContactType;
  contactValue: string;
}

export interface MatchOutcome {
  matchId: string;
  matchSize: MatchSize;
  lightThemeText: string;
  deepThemeText: string;
  members: MemberRow[];
}

export type JoinResult =
  | {
      ok: true;
      entry: { id: string; token: string; matchSize: MatchSize; expiresAt: Date };
      match: MatchOutcome | null;
    }
  | { ok: false; code: 'DUPLICATE' | 'CLOSED'; message: string };

interface EntryRecord {
  id: string;
  name: string;
  department: string;
  contactType: string;
  contactValue: string;
}

function toMemberRow(entry: EntryRecord): MemberRow {
  return {
    id: entry.id,
    name: entry.name,
    department: entry.department,
    contactType: entry.contactType as ContactType,
    contactValue: entry.contactValue,
  };
}

/** Teamsディープリンク（リンクを開く本人は自動的に参加者に含まれるため自分自身は除く） */
export function buildTeamsLink(emails: string[]): string {
  return `https://teams.microsoft.com/l/chat/0/0?users=${emails.join(',')}`;
}

/**
 * 受信者ごとの表示用マッチ結果を生成（同一グループ内にのみ配信される）。
 * Teamsチャットボタンは「Teams利用者が2人以上」いれば表示し、リンクには自分以外の
 * Teams利用者のみを含める（内線利用者はリンクに含められないため、画面側で別途連絡を促す）。
 */
export function buildMatchResult(outcome: MatchOutcome, selfId: string): MatchResult {
  const members: MatchMember[] = outcome.members.map((member) => ({
    name: member.name,
    department: member.department,
    contactType: member.contactType,
    contactValue: member.contactValue,
    isSelf: member.id === selfId,
  }));
  const teamsMembers = outcome.members.filter((member) => member.contactType === 'TEAMS');
  const teamsLink =
    teamsMembers.length >= 2
      ? buildTeamsLink(teamsMembers.filter((member) => member.id !== selfId).map((member) => member.contactValue))
      : null;

  return {
    matchId: outcome.matchId,
    matchSize: outcome.matchSize,
    lightThemeText: outcome.lightThemeText,
    deepThemeText: outcome.deepThemeText,
    members,
    teamsLink,
  };
}

async function pickRandomTheme(tx: Tx, category: 'LIGHT' | 'DEEP', fallback: string): Promise<string> {
  const count = await tx.talkTheme.count({ where: { category } });
  if (count === 0) {
    return fallback;
  }
  const skip = crypto.randomInt(count);
  const theme = await tx.talkTheme.findFirst({ where: { category }, orderBy: { id: 'asc' }, skip });
  return theme?.text ?? fallback;
}

/** ロック取得済みのトランザクション内で呼び出すこと */
async function tryMatch(tx: Tx, site: Site, matchSize: MatchSize, now: Date): Promise<MatchOutcome | null> {
  const candidates = await tx.queueEntry.findMany({
    where: { site, status: STATUS.WAITING, matchSize, expiresAt: { gt: now } },
    orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
    take: matchSize,
  });
  if (candidates.length < matchSize) {
    return null;
  }

  const [lightThemeText, deepThemeText] = await Promise.all([
    pickRandomTheme(tx, 'LIGHT', FALLBACK_LIGHT_THEME),
    pickRandomTheme(tx, 'DEEP', FALLBACK_DEEP_THEME),
  ]);
  const matchId = crypto.randomUUID();
  const ids = candidates.map((candidate) => candidate.id);
  const today = getJstDateString(now);

  await tx.matchGroup.create({ data: { id: matchId, site, matchSize, lightThemeText, deepThemeText } });
  await tx.queueEntry.updateMany({
    where: { id: { in: ids }, status: STATUS.WAITING },
    data: { status: STATUS.MATCHED, matchGroupId: matchId },
  });
  await tx.dailyStat.upsert({
    where: { date_site: { date: today, site } },
    create: {
      date: today,
      site,
      twoMatchCount: matchSize === 2 ? 1 : 0,
      fourMatchCount: matchSize === 4 ? 1 : 0,
    },
    update: matchSize === 2 ? { twoMatchCount: { increment: 1 } } : { fourMatchCount: { increment: 1 } },
  });

  return { matchId, matchSize, lightThemeText, deepThemeText, members: candidates.map(toMemberRow) };
}

/** 待機人数（拠点ごと。有効期限切れのゴーストエントリーは除外して数える） */
export async function getQueueStatus(site: Site, now: Date = new Date()): Promise<QueueStatus> {
  const [two, four] = await Promise.all([
    prisma.queueEntry.count({ where: { site, status: STATUS.WAITING, matchSize: 2, expiresAt: { gt: now } } }),
    prisma.queueEntry.count({ where: { site, status: STATUS.WAITING, matchSize: 4, expiresAt: { gt: now } } }),
  ]);
  return { two, four };
}

/** 参加登録。重複チェック→キュー追加→成立判定を、DBアドバイザリロックにより拠点ごとに排他的に行う。 */
export function joinQueue(input: JoinInput, now: Date = new Date()): Promise<JoinResult> {
  return withQueueLock(async (tx): Promise<JoinResult> => {
    const status = getServiceStatus(now);
    if (!status.open) {
      return { ok: false, code: 'CLOSED', message: '現在は受付時間外です。受付時間をご確認ください。' };
    }

    const duplicate =
      input.contactType === 'TEAMS'
        ? await tx.queueEntry.findFirst({
            where: { site: input.site, status: STATUS.WAITING, contactType: 'TEAMS', contactValue: input.contactValue },
            select: { id: true },
          })
        : await tx.queueEntry.findFirst({
            where: {
              site: input.site,
              status: STATUS.WAITING,
              contactType: 'EXTENSION',
              contactValue: input.contactValue,
              name: input.name,
            },
            select: { id: true },
          });
    if (duplicate) {
      return { ok: false, code: 'DUPLICATE', message: DUPLICATE_MESSAGE };
    }

    const config = getServiceConfig();
    let expiresAt = new Date(now.getTime() + config.waitSeconds * 1000);
    if (!config.ignoreHours) {
      const closeAt = getCloseAt(now);
      if (closeAt.getTime() < expiresAt.getTime()) {
        expiresAt = closeAt;
      }
    }

    const token = crypto.randomBytes(24).toString('hex');
    const entry = await tx.queueEntry.create({
      data: {
        site: input.site,
        token,
        name: input.name,
        department: input.department,
        contactType: input.contactType,
        contactValue: input.contactValue,
        matchSize: input.matchSize,
        status: STATUS.WAITING,
        expiresAt,
      },
    });

    const match = await tryMatch(tx, input.site, input.matchSize, now);
    return {
      ok: true,
      entry: { id: entry.id, token, matchSize: input.matchSize, expiresAt },
      match,
    };
  });
}

/** 本人トークン確認のうえ、待機中エントリーを削除する（離脱・キャンセル時）。配信先チャンネル用にsiteも返す。 */
export function leaveByToken(entryId: string, token: string): Promise<{ removed: boolean; site: Site | null }> {
  return withQueueLock(async (tx) => {
    const entry = await tx.queueEntry.findUnique({ where: { id: entryId } });
    if (!entry || entry.status !== STATUS.WAITING || !safeEqualLocal(entry.token, token)) {
      return { removed: false, site: null };
    }
    await tx.queueEntry.delete({ where: { id: entryId } });
    return { removed: true, site: entry.site as Site };
  });
}

/**
 * クライアントの残り時間表示が0になった際に呼ばれる。
 * サーバー側でも期限切れを確認し、真に期限切れならば削除してtrueを返す。
 * 呼び出し直前ぎりぎりで成立していた場合は、成立結果を返す（レース対策）。
 */
export function checkTimeout(
  entryId: string,
  token: string,
  now: Date = new Date(),
): Promise<{ expired: boolean; match: MatchResult | null; notFound: boolean; site: Site | null }> {
  return withQueueLock(async (tx) => {
    const entry = await tx.queueEntry.findUnique({
      where: { id: entryId },
      include: { matchGroup: { include: { entries: true } } },
    });
    if (!entry || !safeEqualLocal(entry.token, token)) {
      return { expired: true, match: null, notFound: true, site: null };
    }
    const site = entry.site as Site;
    if (entry.status === STATUS.MATCHED && entry.matchGroup) {
      const outcome: MatchOutcome = {
        matchId: entry.matchGroup.id,
        matchSize: entry.matchGroup.matchSize as MatchSize,
        lightThemeText: entry.matchGroup.lightThemeText,
        deepThemeText: entry.matchGroup.deepThemeText,
        members: entry.matchGroup.entries.map(toMemberRow),
      };
      return { expired: false, match: buildMatchResult(outcome, entry.id), notFound: false, site };
    }
    if (entry.expiresAt.getTime() <= now.getTime()) {
      await tx.queueEntry.delete({ where: { id: entryId } });
      return { expired: true, match: null, notFound: false, site };
    }
    return { expired: false, match: null, notFound: false, site };
  });
}

/** 緊急機能: 指定した拠点の待機データを全削除。通知対象のentryIdを返す。 */
export function cancelAllWaiting(site: Site): Promise<{ count: number; entryIds: string[] }> {
  return withQueueLock(async (tx) => {
    const waiting = await tx.queueEntry.findMany({ where: { site, status: STATUS.WAITING }, select: { id: true } });
    if (waiting.length > 0) {
      await tx.queueEntry.deleteMany({ where: { site, status: STATUS.WAITING } });
    }
    return { count: waiting.length, entryIds: waiting.map((entry) => entry.id) };
  });
}

/**
 * 日次リセット（毎日00:00 JST / Vercel Cron から起動。全拠点が対象）
 * - 待機データ削除 / 異常終了データ削除 / 過去日の成立中データ削除 / 過去日の成立件数削除
 */
export function resetDaily(now: Date = new Date()): Promise<{ entryIds: string[]; deletedWaiting: number }> {
  return withQueueLock(async (tx) => {
    const today = getJstDateString(now);
    const startOfToday = getJstStartOfDay(now);

    const waiting = await tx.queueEntry.findMany({ where: { status: STATUS.WAITING }, select: { id: true } });

    await tx.queueEntry.deleteMany({
      where: { OR: [{ status: STATUS.WAITING }, { joinedAt: { lt: startOfToday } }] },
    });
    await tx.matchGroup.deleteMany({ where: { createdAt: { lt: startOfToday } } });
    await tx.dailyStat.deleteMany({ where: { date: { not: today } } });

    return { deletedWaiting: waiting.length, entryIds: waiting.map((entry) => entry.id) };
  });
}

/** 本人（entryId + token）のみがマッチ結果を再取得できる */
export async function getMatchResult(entryId: string, token: string): Promise<MatchResult | null> {
  const entry = await prisma.queueEntry.findUnique({
    where: { id: entryId },
    include: { matchGroup: { include: { entries: { orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }] } } } },
  });
  if (!entry || entry.status !== STATUS.MATCHED || !entry.matchGroup || !safeEqualLocal(entry.token, token)) {
    return null;
  }
  const group = entry.matchGroup;
  const outcome: MatchOutcome = {
    matchId: group.id,
    matchSize: group.matchSize as MatchSize,
    lightThemeText: group.lightThemeText,
    deepThemeText: group.deepThemeText,
    members: group.entries.map(toMemberRow),
  };
  return buildMatchResult(outcome, entry.id);
}

export async function getDashboard(site: Site, now: Date = new Date()): Promise<AdminDashboardData> {
  const today = getJstDateString(now);
  const [rows, stat] = await Promise.all([
    prisma.queueEntry.findMany({
      where: { site, status: STATUS.WAITING, expiresAt: { gt: now } },
      orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
    }),
    prisma.dailyStat.findUnique({ where: { date_site: { date: today, site } } }),
  ]);

  return {
    site,
    waiting: rows.map((row) => ({
      id: row.id,
      name: row.name,
      department: row.department,
      contactType: row.contactType as ContactType,
      contactValue: row.contactValue,
      matchSize: row.matchSize as MatchSize,
      joinedAt: row.joinedAt.toISOString(),
    })),
    waitingCounts: {
      two: rows.filter((row) => row.matchSize === 2).length,
      four: rows.filter((row) => row.matchSize === 4).length,
    },
    today: {
      date: today,
      two: stat?.twoMatchCount ?? 0,
      four: stat?.fourMatchCount ?? 0,
    },
    serverTime: now.toISOString(),
  };
}
