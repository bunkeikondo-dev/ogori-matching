'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, apiFetch } from '@/lib/api';
import { API_ROUTES } from '@/lib/constants';
import {
  ENTRY_CANCELLED_EVENT,
  ENTRY_MATCH_EVENT,
  entryChannelName,
  QUEUE_STATUS_CHANNEL,
  QUEUE_STATUS_EVENT,
} from '@/lib/realtime-channels';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';
import type {
  FieldErrors,
  JoinAck,
  JoinFormValues,
  MatchResult,
  MatchSize,
  QueueStatus,
  ServiceStatus,
  TimeoutCheckResult,
} from '@/lib/types';
import { validateJoinInput } from '@/lib/validation';
import CancelledView from './CancelledView';
import ClosedView from './ClosedView';
import MatchedView from './MatchedView';
import RegistrationForm from './RegistrationForm';
import TimeoutView from './TimeoutView';
import { Alert, Container, FullPageLoading } from './ui';
import WaitingView from './WaitingView';

type View =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'closed' }
  | { kind: 'form' }
  | { kind: 'waiting'; matchSize: MatchSize; expiresAt: number; clockOffset: number }
  | { kind: 'matched'; result: MatchResult }
  | { kind: 'timeout' }
  | { kind: 'cancelled'; message: string };

interface StoredSession {
  entryId: string;
  token: string;
}

const SESSION_KEY = 'ogori-match-session';
const SERVICE_POLL_MS = 30_000;

const INITIAL_VALUES: JoinFormValues = {
  name: '',
  department: '',
  contactType: 'TEAMS',
  teamsId: '',
  extension: '',
  matchSize: 2,
};

function readStoredSession(): StoredSession | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as StoredSession).entryId === 'string' &&
      typeof (parsed as StoredSession).token === 'string'
    ) {
      return parsed as StoredSession;
    }
  } catch {
    // sessionStorageが使えない環境では復元しない
  }
  return null;
}

function storeSession(session: StoredSession): void {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // 保存できなくても動作には影響しない
  }
}

function clearSession(): void {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // noop
  }
}

/** タブ終了・リロード・ページ離脱時に、確実性の高い sendBeacon で離脱を通知する */
function sendLeaveBeacon(entry: StoredSession): void {
  try {
    const body = new Blob([JSON.stringify(entry)], { type: 'application/json' });
    navigator.sendBeacon(API_ROUTES.LEAVE, body);
  } catch {
    // sendBeacon非対応環境では通知できない（サーバー側のタイムアウト監視に委ねる）
  }
}

export default function MatchingApp() {
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [service, setService] = useState<ServiceStatus | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({ two: 0, four: 0 });
  const [values, setValues] = useState<JoinFormValues>(INITIAL_VALUES);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const viewRef = useRef<View>(view);
  const entryRef = useRef<StoredSession | null>(null);

  const changeView = useCallback((next: View) => {
    viewRef.current = next;
    setView(next);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0 });
    }
  }, []);

  const applyServiceStatus = useCallback(
    (status: ServiceStatus) => {
      setService(status);
      const current = viewRef.current;
      if (current.kind === 'loading') {
        changeView(status.open ? { kind: 'form' } : { kind: 'closed' });
      } else if (current.kind === 'form' && !status.open) {
        changeView({ kind: 'closed' });
      } else if (current.kind === 'closed' && status.open) {
        changeView({ kind: 'form' });
      }
    },
    [changeView],
  );

  const loadService = useCallback(async () => {
    try {
      applyServiceStatus(await apiFetch<ServiceStatus>(API_ROUTES.SERVICE_STATUS));
    } catch (error) {
      changeView({
        kind: 'error',
        message: error instanceof Error ? error.message : '受付状況の取得に失敗しました。',
      });
    }
  }, [applyServiceStatus, changeView]);

  // 初期化: 成立済みセッションの復元 → 受付状況の取得
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const stored = readStoredSession();
      if (stored) {
        try {
          const result = await apiFetch<MatchResult>(
            `${API_ROUTES.MATCH_RESULT}?entryId=${encodeURIComponent(stored.entryId)}&token=${encodeURIComponent(stored.token)}`,
          );
          if (!cancelled) {
            changeView({ kind: 'matched', result });
          }
          return;
        } catch {
          clearSession();
        }
      }
      if (!cancelled) {
        await loadService();
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [changeView, loadService]);

  // 受付状況の定期確認（15:00到達・09:00再開の自動切替）
  useEffect(() => {
    const timer = setInterval(async () => {
      const kind = viewRef.current.kind;
      if (kind !== 'form' && kind !== 'closed') {
        return;
      }
      try {
        applyServiceStatus(await apiFetch<ServiceStatus>(API_ROUTES.SERVICE_STATUS));
      } catch {
        // 一時的な失敗は無視し、次回の周期で再確認する
      }
    }, SERVICE_POLL_MS);
    return () => clearInterval(timer);
  }, [applyServiceStatus]);

  const finishMatched = useCallback(
    (result: MatchResult) => {
      const entry = entryRef.current;
      if (entry) {
        storeSession(entry);
      }
      changeView({ kind: 'matched', result });
    },
    [changeView],
  );

  // 待機人数（全体配信）をSupabase Realtimeで購読
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(QUEUE_STATUS_CHANNEL)
      .on('broadcast', { event: QUEUE_STATUS_EVENT }, (message) => {
        setQueueStatus(message.payload as QueueStatus);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  // 待機中: 自分のentryId専用チャンネルを購読し、マッチ成立・取り消しを受け取る
  useEffect(() => {
    if (view.kind !== 'waiting' || !entryRef.current) {
      return;
    }
    const entryId = entryRef.current.entryId;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(entryChannelName(entryId))
      .on('broadcast', { event: ENTRY_MATCH_EVENT }, (message) => {
        if (viewRef.current.kind === 'waiting') {
          finishMatched(message.payload as MatchResult);
        }
      })
      .on('broadcast', { event: ENTRY_CANCELLED_EVENT }, (message) => {
        if (viewRef.current.kind === 'waiting') {
          const payload = message.payload as { message?: string };
          entryRef.current = null;
          changeView({
            kind: 'cancelled',
            message: payload?.message ?? '待機がキャンセルされました。再度お申し込みください。',
          });
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.kind === 'waiting' ? entryRef.current?.entryId : null]);

  // ブラウザ終了・タブ終了・リロード・ページ離脱時の離脱通知（sendBeacon）
  useEffect(() => {
    const onPageHide = () => {
      if (viewRef.current.kind === 'waiting' && entryRef.current) {
        sendLeaveBeacon(entryRef.current);
      }
    };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, []);

  const handleChange = useCallback((patch: Partial<JoinFormValues>) => {
    setValues((current) => ({ ...current, ...patch }));
    setFieldErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch) as Array<keyof JoinFormValues>) {
        delete next[key];
      }
      return next;
    });
    setFormError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submitting) {
      return;
    }
    const validation = validateJoinInput(values);
    if (!validation.ok) {
      setFieldErrors(validation.errors);
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);

    try {
      const ack = await apiFetch<JoinAck>(API_ROUTES.JOIN, {
        method: 'POST',
        body: JSON.stringify(values),
      });

      if (!ack.ok) {
        if (ack.fieldErrors) {
          setFieldErrors(ack.fieldErrors);
        }
        setFormError(ack.message);
        if (ack.code === 'CLOSED') {
          try {
            applyServiceStatus(await apiFetch<ServiceStatus>(API_ROUTES.SERVICE_STATUS));
          } catch {
            // 受付状況の再取得に失敗してもエラー表示は維持する
          }
        }
        return;
      }

      entryRef.current = { entryId: ack.entryId, token: ack.token };
      if (ack.match) {
        finishMatched(ack.match);
      } else {
        changeView({
          kind: 'waiting',
          matchSize: ack.matchSize,
          expiresAt: ack.expiresAt,
          clockOffset: ack.serverNow - Date.now(),
        });
      }
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : 'サーバーに接続できませんでした。時間をおいて再度お試しください。',
      );
    } finally {
      setSubmitting(false);
    }
  }, [applyServiceStatus, changeView, finishMatched, submitting, values]);

  const handleCancel = useCallback(async () => {
    const entry = entryRef.current;
    if (entry) {
      try {
        await apiFetch(API_ROUTES.LEAVE, { method: 'POST', body: JSON.stringify(entry) });
      } catch {
        // 応答がなくてもローカルの状態はフォームへ戻す
      }
    }
    entryRef.current = null;
    changeView({ kind: 'form' });
  }, [changeView]);

  const handleLocalTimeout = useCallback(async () => {
    const entry = entryRef.current;
    if (!entry) {
      return;
    }
    try {
      const result = await apiFetch<TimeoutCheckResult>(API_ROUTES.TIMEOUT_CHECK, {
        method: 'POST',
        body: JSON.stringify(entry),
      });
      if (!result.expired && result.match) {
        finishMatched(result.match);
        return;
      }
    } catch {
      // サーバー確認に失敗した場合も、カウントダウン0はタイムアウトとして扱う
    }
    entryRef.current = null;
    changeView({ kind: 'timeout' });
  }, [changeView, finishMatched]);

  const goToTop = useCallback(async () => {
    clearSession();
    entryRef.current = null;
    setFormError(null);
    setFieldErrors({});
    changeView({ kind: 'loading' });
    await loadService();
  }, [changeView, loadService]);

  return (
    <Container>
      {view.kind === 'loading' && <FullPageLoading />}

      {view.kind === 'error' && (
        <section className="card space-y-4 text-center">
          <Alert tone="error">{view.message}</Alert>
          <button type="button" onClick={() => void goToTop()} className="btn-primary">
            再読み込み
          </button>
        </section>
      )}

      {view.kind === 'closed' && <ClosedView status={service} />}

      {view.kind === 'form' && (
        <RegistrationForm
          values={values}
          errors={fieldErrors}
          formError={formError}
          submitting={submitting}
          onChange={handleChange}
          onSubmit={() => void handleSubmit()}
        />
      )}

      {view.kind === 'waiting' && (
        <WaitingView
          matchSize={view.matchSize}
          expiresAt={view.expiresAt}
          clockOffset={view.clockOffset}
          status={queueStatus}
          onCancel={() => void handleCancel()}
          onLocalTimeout={() => void handleLocalTimeout()}
        />
      )}

      {view.kind === 'matched' && <MatchedView result={view.result} onReset={() => void goToTop()} />}

      {view.kind === 'timeout' && <TimeoutView onRetry={() => void goToTop()} />}

      {view.kind === 'cancelled' && <CancelledView message={view.message} onRetry={() => void goToTop()} />}
    </Container>
  );
}
