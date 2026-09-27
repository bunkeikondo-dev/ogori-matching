'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, apiFetch } from '@/lib/api';
import { QUEUE_STATUS_CHANNEL, QUEUE_STATUS_EVENT } from '@/lib/realtime-channels';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';
import { formatJstTime } from '@/lib/time';
import type { AdminDashboardData } from '@/lib/types';
import { Alert, FullPageLoading, Spinner } from '../ui';
import ThemeManager from './ThemeManager';

interface Props {
  onUnauthorized: () => void;
  onLogout: () => void;
}

type Tab = 'status' | 'themes';

const POLL_INTERVAL_MS = 10_000;

function StatCard({ title, value, unit }: { title: string; value: number; unit: string }) {
  return (
    <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
      <p className="text-xs font-semibold text-brand-700">{title}</p>
      <p className="mt-1 text-3xl font-extrabold tabular-nums text-brand-900">
        {value}
        <span className="ml-1 text-base font-semibold">{unit}</span>
      </p>
    </div>
  );
}

export default function AdminDashboard({ onUnauthorized, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('status');
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<AdminDashboardData>('/api/admin/dashboard'));
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
        return;
      }
      setError(err instanceof Error ? err.message : '状況の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized]);

  // 初回取得 + 定期更新
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  // Supabase Realtime（待機人数の変化）を契機に即時更新
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(QUEUE_STATUS_CHANNEL)
      .on('broadcast', { event: QUEUE_STATUS_EVENT }, () => {
        if (refreshTimer.current) {
          clearTimeout(refreshTimer.current);
        }
        refreshTimer.current = setTimeout(() => void load(), 300);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
      }
    };
  }, [load]);

  const handlePurge = async () => {
    if (purging) {
      return;
    }
    if (!window.confirm('本当に削除しますか？')) {
      return;
    }
    setPurging(true);
    setError(null);
    setNotice(null);
    try {
      const result = await apiFetch<{ ok: boolean; deleted: number }>('/api/admin/queue', { method: 'DELETE' });
      setNotice(`全待機データを削除しました（${result.deleted}件）。`);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
        return;
      }
      setError(err instanceof Error ? err.message : '削除に失敗しました。');
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-800">管理画面</h1>
        <div className="flex gap-2">
          <a href="/" className="btn-secondary btn-sm">
            参加画面へ
          </a>
          <button type="button" onClick={onLogout} className="btn-secondary btn-sm">
            ログアウト
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-brand-100" role="tablist">
        {(
          [
            ['status', '待機・成立状況'],
            ['themes', 'トークテーマ管理'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-px rounded-t-lg border-b-2 px-4 py-2 text-sm font-semibold transition ${
              tab === key
                ? 'border-brand-700 text-brand-800'
                : 'border-transparent text-slate-500 hover:text-brand-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'themes' ? (
        <ThemeManager onUnauthorized={onUnauthorized} />
      ) : loading && !data ? (
        <FullPageLoading />
      ) : (
        <div className="space-y-5">
          {error ? <Alert tone="error">{error}</Alert> : null}
          {notice ? <Alert tone="success">{notice}</Alert> : null}

          {data ? (
            <>
              <section className="card">
                <h2 className="text-lg font-bold text-brand-800">待機人数</h2>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <StatCard title="2人マッチ待機" value={data.waitingCounts.two} unit="名" />
                  <StatCard title="4人マッチ待機" value={data.waitingCounts.four} unit="名" />
                </div>
              </section>

              <section className="card">
                <h2 className="text-lg font-bold text-brand-800">本日成立（{data.today.date}）</h2>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <StatCard title="2人マッチ" value={data.today.two} unit="件" />
                  <StatCard title="4人マッチ" value={data.today.four} unit="件" />
                </div>
                <p className="mt-2 text-xs text-slate-500">日付が変わる（00:00）とリセットされます。</p>
              </section>

              <section className="card">
                <h2 className="text-lg font-bold text-brand-800">現在待機中ユーザー（{data.waiting.length}名）</h2>
                {data.waiting.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">現在、待機中のユーザーはいません。</p>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-brand-100 text-xs text-slate-500">
                          <th className="py-2 pr-3 font-semibold">氏名</th>
                          <th className="py-2 pr-3 font-semibold">部署</th>
                          <th className="py-2 pr-3 font-semibold">Teams/内線</th>
                          <th className="py-2 pr-3 font-semibold">マッチ種別</th>
                          <th className="py-2 font-semibold">待機開始時刻</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.waiting.map((entry) => (
                          <tr key={entry.id}>
                            <td className="py-2 pr-3 font-medium text-slate-900">{entry.name}</td>
                            <td className="py-2 pr-3">{entry.department}</td>
                            <td className="py-2 pr-3 break-all">
                              {entry.contactType === 'TEAMS' ? `Teams：${entry.contactValue}` : `内線：${entry.contactValue}`}
                            </td>
                            <td className="py-2 pr-3">{entry.matchSize}人</td>
                            <td className="py-2 tabular-nums">{formatJstTime(entry.joinedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="card border-red-200">
                <h2 className="text-lg font-bold text-red-700">緊急機能</h2>
                <p className="mt-1 text-sm text-slate-600">
                  待機中のすべてのデータを削除します。待機中の参加者にはキャンセルが通知されます。
                </p>
                <button type="button" onClick={() => void handlePurge()} disabled={purging} className="btn-danger mt-4">
                  {purging ? (
                    <>
                      <Spinner />
                      削除中...
                    </>
                  ) : (
                    '全待機データ削除'
                  )}
                </button>
              </section>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
