'use client';

import { useState, type FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import { Alert, Spinner } from '../ui';

interface Props {
  onSuccess: () => void;
}

export default function AdminLogin({ onSuccess }: Props) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) {
      return;
    }
    if (!passcode.trim()) {
      setError('パスコードを入力してください。');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiFetch<{ ok: boolean }>('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ passcode }),
      });
      setPasscode('');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="card mx-auto max-w-md space-y-5">
      <h1 className="text-xl font-bold text-brand-800">管理画面ログイン</h1>
      <div>
        <label htmlFor="passcode" className="label">
          パスコード
        </label>
        <input
          id="passcode"
          type="password"
          autoComplete="current-password"
          value={passcode}
          disabled={loading}
          onChange={(event) => {
            setPasscode(event.target.value);
            setError(null);
          }}
          className={`input ${error ? 'input-error' : ''}`}
          aria-invalid={error ? true : undefined}
        />
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? (
          <>
            <Spinner />
            確認中...
          </>
        ) : (
          'ログイン'
        )}
      </button>
      <div className="text-center">
        <a href="/" className="text-sm font-medium text-brand-700 underline-offset-2 hover:underline">
          参加画面へ戻る
        </a>
      </div>
    </form>
  );
}
