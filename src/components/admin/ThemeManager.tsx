'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ApiError, apiFetch } from '@/lib/api';
import { THEME_MAX_LENGTH } from '@/lib/constants';
import type { TalkThemeDto } from '@/lib/types';
import { Alert, Spinner } from '../ui';

interface Props {
  onUnauthorized: () => void;
}

function validateText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return 'トークテーマを入力してください。';
  }
  if (trimmed.length > THEME_MAX_LENGTH) {
    return `トークテーマは${THEME_MAX_LENGTH}文字以内で入力してください。`;
  }
  return null;
}

export default function ThemeManager({ onUnauthorized }: Props) {
  const [themes, setThemes] = useState<TalkThemeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [newText, setNewText] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  const handleError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
        return;
      }
      setError(err instanceof Error ? err.message : '処理に失敗しました。');
    },
    [onUnauthorized],
  );

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ themes: TalkThemeDto[] }>('/api/admin/themes');
      setThemes(data.themes);
      setError(null);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) {
      return;
    }
    const validation = validateText(newText);
    if (validation) {
      setError(validation);
      setNotice(null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/admin/themes', { method: 'POST', body: JSON.stringify({ text: newText.trim() }) });
      setNewText('');
      setNotice('トークテーマを追加しました。');
      await load();
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (theme: TalkThemeDto) => {
    setEditingId(theme.id);
    setEditText(theme.text);
    setError(null);
    setNotice(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleSave = async (id: number) => {
    if (busy) {
      return;
    }
    const validation = validateText(editText);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/themes/${id}`, { method: 'PUT', body: JSON.stringify({ text: editText.trim() }) });
      cancelEdit();
      setNotice('トークテーマを更新しました。');
      await load();
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (theme: TalkThemeDto) => {
    if (busy) {
      return;
    }
    if (!window.confirm(`このトークテーマを削除しますか？\n\n${theme.text}`)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/themes/${theme.id}`, { method: 'DELETE' });
      if (editingId === theme.id) {
        cancelEdit();
      }
      setNotice('トークテーマを削除しました。');
      await load();
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="card">
        <h2 className="text-lg font-bold text-brand-800">運用ルール</h2>
        <div className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="font-bold text-red-700">禁止</p>
            <p className="mt-1 text-red-800">家族 / 年齢 / 出身地 / 趣味 / 個人情報 / 宗教 / 政治 / 思想 / 人事評価 / 査定</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-bold text-emerald-700">推奨</p>
            <p className="mt-1 text-emerald-800">業務改善 / 他部署理解 / ノウハウ共有 / 生産性向上</p>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="text-lg font-bold text-brand-800">トークテーマを追加</h2>
        <form onSubmit={handleAdd} noValidate className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={newText}
            maxLength={THEME_MAX_LENGTH}
            disabled={busy}
            onChange={(event) => {
              setNewText(event.target.value);
              setError(null);
            }}
            className="input flex-1"
            placeholder="例）最近試した業務改善の工夫を教えてください。"
            aria-label="新しいトークテーマ"
          />
          <button type="submit" disabled={busy} className="btn-primary shrink-0">
            追加
          </button>
        </form>
      </section>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <section className="card">
        <h2 className="text-lg font-bold text-brand-800">トークテーマ一覧（{themes.length}件）</h2>
        {loading ? (
          <div className="flex justify-center py-8 text-brand-600">
            <Spinner className="h-8 w-8" />
          </div>
        ) : themes.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">トークテーマが登録されていません。</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {themes.map((theme) => (
              <li key={theme.id} className="py-3">
                {editingId === theme.id ? (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      type="text"
                      value={editText}
                      maxLength={THEME_MAX_LENGTH}
                      disabled={busy}
                      onChange={(event) => setEditText(event.target.value)}
                      className="input flex-1"
                      aria-label="トークテーマを編集"
                    />
                    <div className="flex shrink-0 gap-2">
                      <button type="button" disabled={busy} onClick={() => void handleSave(theme.id)} className="btn-primary btn-sm">
                        保存
                      </button>
                      <button type="button" disabled={busy} onClick={cancelEdit} className="btn-secondary btn-sm">
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm leading-relaxed text-slate-800">
                      <span className="mr-2 font-mono text-xs text-slate-400">#{theme.id}</span>
                      {theme.text}
                    </p>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" disabled={busy} onClick={() => startEdit(theme)} className="btn-secondary btn-sm">
                        編集
                      </button>
                      <button type="button" disabled={busy} onClick={() => void handleDelete(theme)} className="btn-danger btn-sm">
                        削除
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
