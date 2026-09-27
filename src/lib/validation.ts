import { TEAMS_DOMAIN, TEAMS_DOMAIN_WARNING, TEXT_MAX_LENGTH } from './constants';
import type { ContactType, FieldErrors, JoinInput, MatchSize } from './types';

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;
const TEAMS_ID_PATTERN = /^[A-Za-z0-9._-]+$/;
const EXTENSION_PATTERN = /^[0-9]{2,8}$/;
const TEAMS_ID_MAX_LENGTH = 64;

function toStr(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** TeamsユーザーID入力欄にドメイン(@)が含まれているか */
export function containsDomainInput(value: string): boolean {
  return value.normalize('NFKC').includes('@');
}

export type JoinValidationResult =
  | { ok: true; data: JoinInput }
  | { ok: false; errors: FieldErrors };

/** 参加フォームの検証・正規化。クライアントとサーバーで共通利用する。 */
export function validateJoinInput(raw: unknown): JoinValidationResult {
  const source = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const errors: FieldErrors = {};

  // 氏名
  const name = toStr(source.name).trim();
  if (!name) {
    errors.name = '氏名を入力してください。';
  } else if (name.length > TEXT_MAX_LENGTH) {
    errors.name = `氏名は${TEXT_MAX_LENGTH}文字以内で入力してください。`;
  } else if (CONTROL_CHARS.test(name)) {
    errors.name = '氏名に使用できない文字が含まれています。';
  }

  // 部署
  const department = toStr(source.department).trim();
  if (!department) {
    errors.department = '部署を入力してください。';
  } else if (department.length > TEXT_MAX_LENGTH) {
    errors.department = `部署は${TEXT_MAX_LENGTH}文字以内で入力してください。`;
  } else if (CONTROL_CHARS.test(department)) {
    errors.department = '部署に使用できない文字が含まれています。';
  }

  // 連絡手段
  const contactTypeRaw = toStr(source.contactType);
  let contactType: ContactType | null = null;
  if (contactTypeRaw === 'TEAMS' || contactTypeRaw === 'EXTENSION') {
    contactType = contactTypeRaw;
  } else {
    errors.contactType = '連絡手段を選択してください。';
  }

  let contactValue = '';
  if (contactType === 'TEAMS') {
    const teamsId = toStr(source.teamsId).normalize('NFKC').trim();
    if (!teamsId) {
      errors.teamsId = 'メールアドレスのユーザーIDを入力してください。';
    } else if (teamsId.includes('@')) {
      errors.teamsId = TEAMS_DOMAIN_WARNING;
    } else if (teamsId.length > TEAMS_ID_MAX_LENGTH) {
      errors.teamsId = `ユーザーIDは${TEAMS_ID_MAX_LENGTH}文字以内で入力してください。`;
    } else if (!TEAMS_ID_PATTERN.test(teamsId)) {
      errors.teamsId = 'ユーザーIDには半角英数字、ピリオド(.)、ハイフン(-)、アンダースコア(_)のみ使用できます。';
    } else {
      contactValue = `${teamsId.toLowerCase()}@${TEAMS_DOMAIN}`;
    }
  } else if (contactType === 'EXTENSION') {
    const extension = toStr(source.extension).normalize('NFKC').trim();
    if (!extension) {
      errors.extension = '内線番号を入力してください。';
    } else if (!EXTENSION_PATTERN.test(extension)) {
      errors.extension = '内線番号は半角数字2〜8桁で入力してください。';
    } else {
      contactValue = extension;
    }
  }

  // マッチ人数
  const sizeNumber = Number(source.matchSize);
  const matchSize: MatchSize | null = sizeNumber === 2 ? 2 : sizeNumber === 4 ? 4 : null;
  if (matchSize === null) {
    errors.matchSize = 'マッチ人数を選択してください。';
  }

  if (Object.keys(errors).length > 0 || contactType === null || matchSize === null) {
    return { ok: false, errors };
  }

  return { ok: true, data: { name, department, contactType, contactValue, matchSize } };
}
