'use client';

interface Props {
  onRetry: () => void;
}

export default function TimeoutView({ onRetry }: Props) {
  return (
    <section className="card space-y-4 text-center">
      <div className="text-5xl" aria-hidden="true">
        ⌛
      </div>
      <h1 className="text-xl font-bold text-brand-800">今回はマッチングが成立しませんでした。</h1>
      <p className="text-slate-600">時間をおいて再度チャレンジしてください。</p>
      <p className="text-sm text-slate-500">受付時間が過ぎた場合は別日に参加してください。</p>
      <button type="button" onClick={onRetry} className="btn-primary w-full sm:w-auto">
        再度参加する
      </button>
    </section>
  );
}
