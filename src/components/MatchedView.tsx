'use client';

import { COORDINATE_NOTICE, MATCH_NOTICE, TEAMS_GUIDE } from '@/lib/constants';
import type { MatchMember, MatchResult } from '@/lib/types';

interface Props {
  result: MatchResult;
  onReset: () => void;
}

function contactLabel(member: MatchMember): string {
  return member.contactType === 'TEAMS' ? `Teams：${member.contactValue}` : `内線：${member.contactValue}`;
}

export default function MatchedView({ result, onReset }: Props) {
  // Teamsボタンが出ている（Teams利用者が2人以上いる）場合に、リンクに含まれない
  // 内線利用者（自分以外）がいれば、個別に連絡してもらうよう案内する
  const nonTeamsOthers = result.teamsLink
    ? result.members.filter((member) => !member.isSelf && member.contactType !== 'TEAMS')
    : [];

  return (
    <div className="space-y-5">
      {/* 1. マッチ成立メッセージ */}
      <section className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-900 p-6 text-center text-white shadow-card sm:p-8">
        <h1 className="text-3xl font-extrabold">🎉 マッチ成立！</h1>
        <p className="mt-4 text-sm text-brand-100">{COORDINATE_NOTICE}</p>
      </section>

      {/* 2. トークテーマ（ライトトーク・じっくりトークを1つずつ） */}
      <section className="card space-y-4">
        <h2 className="text-sm font-bold text-brand-700">💬 トークテーマ</h2>
        <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
          <p className="text-xs font-bold text-brand-600">ライトトーク</p>
          <p className="mt-1 text-lg font-semibold leading-relaxed text-slate-800">{result.lightThemeText}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-bold text-slate-500">じっくりトーク</p>
          <p className="mt-1 text-lg font-semibold leading-relaxed text-slate-800">{result.deepThemeText}</p>
        </div>
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

      {/* 4. Teamsチャットボタン / 5. Teams案内（Teams利用者が2人以上いる場合のみ） */}
      {result.teamsLink ? (
        <section className="card space-y-3">
          <a href={result.teamsLink} target="_blank" rel="noopener noreferrer" className="btn-primary w-full">
            Teamsチャットを開く
          </a>
          <p className="text-sm text-slate-600">{TEAMS_GUIDE}</p>
          {nonTeamsOthers.length > 0 ? (
            <p className="whitespace-pre-line text-sm font-medium text-amber-700">
              {nonTeamsOthers.map((member) => `${member.name}さんには別途連絡してください。`).join('\n')}
            </p>
          ) : null}
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
