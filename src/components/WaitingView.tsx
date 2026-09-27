'use client';

import { useEffect, useRef, useState } from 'react';
import type { MatchSize, QueueStatus } from '@/lib/types';
import { Spinner } from './ui';

interface Props {
  matchSize: MatchSize;
  /** 待機期限（エポックms・サーバー時刻基準） */
  expiresAt: number;
  /** サーバー時刻 - クライアント時刻 (ms) */
  clockOffset: number;
  status: QueueStatus;
  onCancel: () => void;
  /** カウントダウンが0になった時点で1回だけ呼ばれる（サーバーへの期限確認のトリガー） */
  onLocalTimeout: () => void;
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function Slots({ count, capacity }: { count: number; capacity: number }) {
  const filled = Math.min(count, capacity);
  return (
    <div className="flex gap-1.5" aria-hidden="true">
      {Array.from({ length: capacity }, (_, index) => (
        <span
          key={index}
          className={`h-3 w-3 rounded-full transition-colors ${index < filled ? 'bg-brand-600' : 'bg-brand-100'}`}
        />
      ))}
    </div>
  );
}

function StatusRow({
  label,
  count,
  capacity,
  highlighted,
}: {
  label: string;
  count: number;
  capacity: number;
  highlighted: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
        highlighted ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white'
      }`}
    >
      <div>
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <p className="text-lg font-bold text-brand-800">
          現在 {count} / {capacity} 名
        </p>
      </div>
      <Slots count={count} capacity={capacity} />
    </div>
  );
}

export default function WaitingView({ matchSize, expiresAt, clockOffset, status, onCancel, onLocalTimeout }: Props) {
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, expiresAt - (Date.now() + clockOffset)));
  const timedOutRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      const next = Math.max(0, expiresAt - (Date.now() + clockOffset));
      setRemainingMs(next);
      if (next === 0 && !timedOutRef.current) {
        timedOutRef.current = true;
        onLocalTimeout();
      }
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [expiresAt, clockOffset, onLocalTimeout]);

  // ブラウザ離脱時の確認（離脱すると参加はキャンセルされる）
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const seconds = Math.ceil(remainingMs / 1000);

  return (
    <div className="space-y-5">
      <section className="card text-center">
        <div className="flex justify-center text-brand-600">
          <Spinner className="h-12 w-12" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-brand-800">マッチング中です</h1>
        <p className="mt-2 text-slate-600">参加者を探しています。</p>

        <p
          className="mt-6 font-mono text-6xl font-bold tabular-nums tracking-wider text-brand-700"
          role="timer"
          aria-label={`残り時間 ${formatCountdown(seconds)}`}
        >
          {formatCountdown(seconds)}
        </p>
        <p className="mt-1 text-xs text-slate-500">残り待機時間</p>
      </section>

      <section className="card space-y-3" aria-live="polite">
        <StatusRow label="2人マッチ" count={status.two} capacity={2} highlighted={matchSize === 2} />
        <StatusRow label="4人マッチ" count={status.four} capacity={4} highlighted={matchSize === 4} />
        <p className="text-center text-xs text-slate-500">
          あなたは <span className="font-semibold text-brand-700">{matchSize}人マッチ</span> で待機中です
        </p>
      </section>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-900">
        この画面を閉じると参加がキャンセルされます。
      </div>

      <div className="text-center">
        <button type="button" onClick={onCancel} className="btn-secondary btn-sm">
          参加をキャンセルする
        </button>
      </div>
    </div>
  );
}
