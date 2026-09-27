'use client';

import { Alert } from './ui';

interface Props {
  message: string;
  onRetry: () => void;
}

export default function CancelledView({ message, onRetry }: Props) {
  return (
    <section className="card space-y-4 text-center">
      <div className="text-5xl" aria-hidden="true">
        ⚠️
      </div>
      <h1 className="text-xl font-bold text-brand-800">参加がキャンセルされました</h1>
      <div className="text-left">
        <Alert tone="warning">{message}</Alert>
      </div>
      <button type="button" onClick={onRetry} className="btn-primary w-full sm:w-auto">
        再度参加する
      </button>
    </section>
  );
}
