'use client';

import type { FormEvent, ReactNode } from 'react';
import { TEAMS_DOMAIN, TEAMS_DOMAIN_WARNING } from '@/lib/constants';
import type { ContactType, FieldErrors, JoinFormValues, MatchSize } from '@/lib/types';
import { containsDomainInput } from '@/lib/validation';
import { Alert, Spinner } from './ui';

interface Props {
  values: JoinFormValues;
  errors: FieldErrors;
  formError: string | null;
  submitting: boolean;
  onChange: (patch: Partial<JoinFormValues>) => void;
  onSubmit: () => void;
}

const NOTES = [
  '本日15:00に参加できる方のみお申し込みください',
  'マッチング結果は即時表示されます',
  '待機時間は最大5分です',
  '成立しない場合は再度チャレンジしてください。人数がいない場合は10：00または14：00にマッチングしてください。',
  '受付時間は9:00〜15:00です',
];

interface OptionCardProps {
  name: string;
  checked: boolean;
  disabled: boolean;
  label: string;
  description?: string;
  onSelect: () => void;
}

function OptionCard({ name, checked, disabled, label, description, onSelect }: OptionCardProps) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
        checked
          ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-200'
          : 'border-slate-300 bg-white hover:border-brand-300'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        className="h-4 w-4 accent-brand-700"
      />
      <span>
        <span className="block font-semibold text-slate-800">{label}</span>
        {description ? <span className="block text-xs text-slate-500">{description}</span> : null}
      </span>
    </label>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
        <span className="ml-1 text-red-500" aria-hidden="true">
          *
        </span>
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function RegistrationForm({ values, errors, formError, submitting, onChange, onSubmit }: Props) {
  const domainTyped = containsDomainInput(values.teamsId);
  const teamsError = domainTyped ? TEAMS_DOMAIN_WARNING : errors.teamsId;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  const selectContact = (contactType: ContactType) => onChange({ contactType });
  const selectSize = (matchSize: MatchSize) => onChange({ matchSize });

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <section className="card">
        <h1 className="text-2xl font-bold text-brand-800">おごり自販機マッチング</h1>
        <p className="mt-3 font-medium text-slate-700">部署を越えたコミュニケーションを楽しみませんか？</p>
        <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
          {NOTES.map((note) => (
            <li key={note} className="flex gap-2">
              <span className="text-brand-500" aria-hidden="true">
                ・
              </span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-5">
        <Field id="name" label="氏名" error={errors.name}>
          <input
            id="name"
            type="text"
            autoComplete="name"
            maxLength={50}
            value={values.name}
            disabled={submitting}
            onChange={(event) => onChange({ name: event.target.value })}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? 'name-error' : undefined}
            className={`input ${errors.name ? 'input-error' : ''}`}
            placeholder="例）文溪　太郎"
          />
        </Field>

        <Field id="department" label="部署" error={errors.department}>
          <input
            id="department"
            type="text"
            autoComplete="organization-title"
            maxLength={50}
            value={values.department}
            disabled={submitting}
            onChange={(event) => onChange({ department: event.target.value })}
            aria-invalid={errors.department ? true : undefined}
            aria-describedby={errors.department ? 'department-error' : undefined}
            className={`input ${errors.department ? 'input-error' : ''}`}
            placeholder="例）○○部"
          />
        </Field>

        <fieldset>
          <legend className="label">
            連絡手段
            <span className="ml-1 text-red-500" aria-hidden="true">
              *
            </span>
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <OptionCard
              name="contactType"
              checked={values.contactType === 'TEAMS'}
              disabled={submitting}
              label="Teams"
              onSelect={() => selectContact('TEAMS')}
            />
            <OptionCard
              name="contactType"
              checked={values.contactType === 'EXTENSION'}
              disabled={submitting}
              label="内線"
              onSelect={() => selectContact('EXTENSION')}
            />
          </div>
          {errors.contactType ? (
            <p className="field-error" role="alert">
              {errors.contactType}
            </p>
          ) : null}
        </fieldset>

        {values.contactType === 'TEAMS' ? (
          <Field id="teamsId" label="メールアドレス" error={teamsError}>
            <div className="flex items-center gap-2">
              <input
                id="teamsId"
                type="text"
                inputMode="email"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={64}
                value={values.teamsId}
                disabled={submitting}
                onChange={(event) => onChange({ teamsId: event.target.value })}
                aria-invalid={teamsError ? true : undefined}
                aria-describedby={teamsError ? 'teamsId-error' : undefined}
                className={`input min-w-0 flex-1 ${teamsError ? 'input-error' : ''}`}
                placeholder="×××××"
              />
              <span className="shrink-0 text-sm font-semibold text-slate-600">@{TEAMS_DOMAIN}</span>
            </div>
          </Field>
        ) : (
          <Field id="extension" label="内線番号" error={errors.extension}>
            <input
              id="extension"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              value={values.extension}
              disabled={submitting}
              onChange={(event) => onChange({ extension: event.target.value })}
              aria-invalid={errors.extension ? true : undefined}
              aria-describedby={errors.extension ? 'extension-error' : undefined}
              className={`input ${errors.extension ? 'input-error' : ''}`}
              placeholder="例）1234"
            />
          </Field>
        )}

        <fieldset>
          <legend className="label">
            マッチ人数
            <span className="ml-1 text-red-500" aria-hidden="true">
              *
            </span>
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <OptionCard
              name="matchSize"
              checked={values.matchSize === 2}
              disabled={submitting}
              label="2人でマッチ"
              description="2名集まり次第すぐ成立"
              onSelect={() => selectSize(2)}
            />
            <OptionCard
              name="matchSize"
              checked={values.matchSize === 4}
              disabled={submitting}
              label="4人でマッチ"
              description="4名集まり次第すぐ成立"
              onSelect={() => selectSize(4)}
            />
          </div>
          {errors.matchSize ? (
            <p className="field-error" role="alert">
              {errors.matchSize}
            </p>
          ) : null}
        </fieldset>

        {formError ? <Alert tone="error">{formError}</Alert> : null}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? (
            <>
              <Spinner />
              参加処理中...
            </>
          ) : (
            '参加する'
          )}
        </button>
      </section>

      <div className="text-center">
        <a href="/admin" className="text-sm font-medium text-brand-700 underline-offset-2 hover:underline">
          管理画面
        </a>
      </div>
    </form>
  );
}
