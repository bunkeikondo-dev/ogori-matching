import { SITE_LABELS } from '@/lib/constants';
import type { Site } from '@/lib/types';
import { Container } from './ui';

interface Props {
  site: Site;
}

export default function SiteDisabledView({ site }: Props) {
  return (
    <Container>
      <section className="card space-y-4 text-center">
        <div className="text-5xl" aria-hidden="true">
          🚧
        </div>
        <p className="text-sm font-semibold text-brand-600">{SITE_LABELS[site]}</p>
        <h1 className="text-xl font-bold text-brand-800">このマッチングシステムは現在ご利用いただけません。</h1>
        <p className="text-slate-600">準備が整い次第、改めてご案内します。</p>
        <div className="flex justify-center gap-4 text-center text-sm">
          <a href="/" className="font-medium text-brand-700 underline-offset-2 hover:underline">
            メニューへ戻る
          </a>
          <a href="/admin" className="font-medium text-brand-700 underline-offset-2 hover:underline">
            管理画面
          </a>
        </div>
      </section>
    </Container>
  );
}
