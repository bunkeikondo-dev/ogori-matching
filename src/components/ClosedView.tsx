'use client';

import { SITE_LABELS } from '@/lib/constants';
import type { ServiceStatus, Site } from '@/lib/types';

interface Props {
  status: ServiceStatus | null;
  site: Site;
}

export default function ClosedView({ status, site }: Props) {
  const openTime = status?.openTime ?? '09:30';
  const closeTime = status?.closeTime ?? '09:45';

  let headline = '本日の受付は終了しました。';
  let followUp = `翌営業日${openTime}より受付を再開します。`;
  if (status?.reason === 'BEFORE_OPEN') {
    headline = 'ただいまの時間は受付時間外です。';
    followUp = `本日${openTime}より受付を開始します。`;
  } else if (status?.reason === 'NON_BUSINESS_DAY') {
    headline = '本日は受付を行っておりません。';
    followUp = `翌営業日${openTime}より受付を開始します。`;
  }

  return (
    <div className="space-y-5">
      <section className="card space-y-4 text-center">
        <div className="text-5xl" aria-hidden="true">
          🌙
        </div>
        <p className="text-sm font-semibold text-brand-600">{SITE_LABELS[site]}</p>
        <h1 className="text-xl font-bold text-brand-800">{headline}</h1>
        <div className="rounded-xl bg-brand-50 px-4 py-3">
          <p className="text-xs font-semibold text-brand-700">受付時間</p>
          <p className="text-2xl font-bold text-brand-900">
            {openTime}〜{closeTime}
          </p>
        </div>
        <p className="text-slate-600">{followUp}</p>
      </section>
      <div className="flex justify-center gap-4 text-center text-sm">
        <a href="/" className="font-medium text-brand-700 underline-offset-2 hover:underline">
          メニューへ戻る
        </a>
        <a href="/admin" className="font-medium text-brand-700 underline-offset-2 hover:underline">
          管理画面
        </a>
      </div>
    </div>
  );
}
