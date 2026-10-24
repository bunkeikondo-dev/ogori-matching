import { notFound } from 'next/navigation';
import { isSite } from '@/lib/validation';
import type { Site } from '@/lib/types';
import { isSiteEnabled } from '@/server/site-config';
import MatchingApp from '@/components/MatchingApp';
import SiteDisabledView from '@/components/SiteDisabledView';

export default async function SiteMatchingPage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  if (!isSite(site)) {
    notFound();
  }
  // isSite() で検証済みの値として扱う（notFound() は本来 never を返すが、
  // 型解決の環境差で絞り込みが効かない場合に備えて明示的にキャストしておく）。
  const validSite = site as Site;

  if (!isSiteEnabled(validSite)) {
    return <SiteDisabledView site={validSite} />;
  }

  return <MatchingApp site={validSite} />;
}
