import { SITES } from '@/lib/constants';
import type { Site } from '@/lib/types';

/**
 * Vercelの環境変数 ENABLED_SITES（カンマ区切り。例: "gifu" や "gifu,tokyo"）で、
 * 利用可能な拠点を切り替える。コードを変更せず、Vercelの設定変更＋再デプロイだけで
 * 拠点のON/OFFができるようにするための仕組み。
 * 未設定・空・不正な値のときは、誤って全拠点が止まらないよう安全側（全拠点有効）に倒す。
 */
export function getEnabledSites(): Site[] {
  const raw = process.env.ENABLED_SITES;
  if (!raw || !raw.trim()) {
    return [...SITES];
  }
  const requested = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const valid = requested.filter((part): part is Site => (SITES as readonly string[]).includes(part));
  if (valid.length === 0) {
    console.warn('[site-config] ENABLED_SITES の値が不正なため、全拠点を有効として扱います。');
    return [...SITES];
  }
  return Array.from(new Set(valid));
}

export function isSiteEnabled(site: Site): boolean {
  return getEnabledSites().includes(site);
}
