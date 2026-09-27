'use client';

import { EVENT_DATE_TEXT, EVENT_PLACE, MATCH_NOTICE, TEAMS_GUIDE } from '@/lib/constants';
import type { MatchMember, MatchResult } from '@/lib/types';

interface Props {
  result: MatchResult;
  onReset: () => void;
}

function contactLabel(member: MatchMember): string {
  return member.contactType === 'TEAMS' ? `Teams：${member.contactValue}` : `内線：${member.contactValue}`;
}

export default function MatchedView({ result, onReset }: Props) {
  return (
    <div className="space-y-5">
      {/* 1. マッチ成立メッセージ */}
      <section className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-900 p-6 text-center text-white shadow-card sm:p-8">
        <h1 className="text-3xl font-extrabold">🎉 マッチ成立！</h1>
        <dl className="mt-5 space-y-2 text-lg">
          <div className="flex flex-col items-center sm:flex-row sm:justify-center sm:gap-3">
            <dt className="text-sm font-semibold text-brand-100">日時</dt>
            <dd className="font-bold">：{EVENT_DATE_TEXT}</dd>
          </div>
          <div className="flex flex-col items-center sm:flex-row sm:justify-center sm:gap-3">
            <dt className="text-sm font-semibold text-brand-100">集合場所</dt>
            <dd className="font-bold">：{EVENT_PLACE}</dd>
          </div>
        </dl>
      </section>

      {/* 2. トークテーマ */}
      <section className="card">
        <h2 className="text-sm font-bold text-brand-700">💬 トークテーマ</h2>
        <p className="mt-2 text-lg font-semibold leading-relaxed text-slate-800">{result.themeText}</p>
      </section>

      {/* 3. 参加メンバー */}
      <section className="card">
        <h2 className="text-sm font-bold text-brand-700">👥 参加メンバー（{result.members.length}名）</h2>
        <ul className="mt-3 space-y-3">
          {result.members.map((member, index) => (
            <li
              key={`${member.contactType}-${member.contactValue}-${index}`}
              className={`rounded-xl border px-4 py-3 ${
                member.isSelf ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-white'
              }`}
            >
              <p className="flex flex-wrap items-center gap-2 font-bold text-slate-900">
                {member.name}
                {member.isSelf ? (
                  <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">あなた</span>
                ) : null}
              </p>
              <p className="mt-1 text-sm text-slate-600">部署：{member.department}</p>
              <p className="break-all text-sm text-slate-600">{contactLabel(member)}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 4. Teamsチャットボタン / 5. Teams案内（全員Teams利用者の場合のみ） */}
      {result.teamsLink ? (
        <section className="card space-y-3">
          <a href={result.teamsLink} target="_blank" rel="noopener noreferrer" className="btn-primary w-full">
            Teamsチャットを開く
          </a>
          <p className="text-sm text-slate-600">{TEAMS_GUIDE}</p>
        </section>
      ) : null}

      {/* 6. 注意事項 */}
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
        {MATCH_NOTICE}
      </section>

      <div className="text-center">
        <button type="button" onClick={onReset} className="btn-secondary">
          トップに戻る
        </button>
      </div>
    </div>
  );
}
