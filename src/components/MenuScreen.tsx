'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { API_ROUTES, SITE_DESCRIPTIONS, SITE_LABELS, SITES } from '@/lib/constants';
import type { ServiceStatus, Site } from '@/lib/types';
import { Container, Spinner } from './ui';

interface Props {
  /** Vercelの環境変数 ENABLED_SITES で現在利用可能とされている拠点の一覧 */
  enabledSites: Site[];
}

export default function MenuScreen({ enabledSites }: Props) {
  const [service, setService] = useState<ServiceStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<ServiceStatus>(API_ROUTES.SERVICE_STATUS)
      .then((status) => {
        if (!cancelled) {
          setService(status);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Container>
      <section className="card text-center">
        <h1 className="text-2xl font-bold text-brand-800">おごり自販機マッチング</h1>
        <p className="mt-2 text-slate-600">利用するマッチングシステムを選んでください。</p>
        <p className="mt-3 text-sm text-slate-500">
          {service ? (
            <>
              受付時間：{service.openTime}〜{service.closeTime}
              {service.open ? (
                <span className="ml-2 font-semibold text-emerald-600">受付中</span>
              ) : (
                <span className="ml-2 font-semibold text-slate-500">受付時間外</span>
              )}
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-slate-400">
              <Spinner className="h-4 w-4" />
              受付状況を確認中...
            </span>
          )}
        </p>
      </section>

      <div className="mt-5 space-y-4">
        {SITES.map((site: Site) => {
          const enabled = enabledSites.includes(site);
          if (!enabled) {
            return (
              <div
                key={site}
                aria-disabled="true"
                className="card block cursor-not-allowed opacity-60"
              >
                <p className="flex items-center gap-2 text-lg font-bold text-slate-500">
                  {SITE_LABELS[site]}
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    現在ご利用いただけません
                  </span>
                </p>
                <p className="mt-1 text-sm text-slate-400">{SITE_DESCRIPTIONS[site]}</p>
              </div>
            );
          }
          return (
            <a
              key={site}
              href={`/${site}`}
              className="card block transition hover:border-brand-400 hover:shadow-md"
            >
              <p className="text-lg font-bold text-brand-800">{SITE_LABELS[site]}</p>
              <p className="mt-1 text-sm text-slate-600">{SITE_DESCRIPTIONS[site]}</p>
            </a>
          );
        })}
      </div>

      <div className="mt-6 text-center">
        <a href="/admin" className="text-sm font-medium text-brand-700 underline-offset-2 hover:underline">
          管理画面
        </a>
      </div>
    </Container>
  );
}
