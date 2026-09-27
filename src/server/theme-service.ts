import { THEME_MAX_LENGTH } from '@/lib/constants';
import { prisma } from '@/lib/prisma';
import type { TalkThemeDto } from '@/lib/types';

export type ThemeValidation = { ok: true; text: string } | { ok: false; message: string };

export class ThemeError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ThemeError';
    this.status = status;
  }
}

export function validateThemeText(raw: unknown): ThemeValidation {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) {
    return { ok: false, message: 'トークテーマを入力してください。' };
  }
  if (text.length > THEME_MAX_LENGTH) {
    return { ok: false, message: `トークテーマは${THEME_MAX_LENGTH}文字以内で入力してください。` };
  }
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text)) {
    return { ok: false, message: 'トークテーマに使用できない文字が含まれています。' };
  }
  return { ok: true, text };
}

function errorCode(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : null;
  }
  return null;
}

function toDto(theme: { id: number; text: string; createdAt: Date; updatedAt: Date }): TalkThemeDto {
  return {
    id: theme.id,
    text: theme.text,
    createdAt: theme.createdAt.toISOString(),
    updatedAt: theme.updatedAt.toISOString(),
  };
}

export async function listThemes(): Promise<TalkThemeDto[]> {
  const themes = await prisma.talkTheme.findMany({ orderBy: { id: 'asc' } });
  return themes.map(toDto);
}

export async function createTheme(text: string): Promise<TalkThemeDto> {
  try {
    return toDto(await prisma.talkTheme.create({ data: { text } }));
  } catch (error) {
    if (errorCode(error) === 'P2002') {
      throw new ThemeError('同じトークテーマが既に登録されています。', 409);
    }
    throw error;
  }
}

export async function updateTheme(id: number, text: string): Promise<TalkThemeDto> {
  try {
    return toDto(await prisma.talkTheme.update({ where: { id }, data: { text } }));
  } catch (error) {
    const code = errorCode(error);
    if (code === 'P2002') {
      throw new ThemeError('同じトークテーマが既に登録されています。', 409);
    }
    if (code === 'P2025') {
      throw new ThemeError('指定されたトークテーマが見つかりません。', 404);
    }
    throw error;
  }
}

export async function deleteTheme(id: number): Promise<void> {
  try {
    await prisma.talkTheme.delete({ where: { id } });
  } catch (error) {
    if (errorCode(error) === 'P2025') {
      throw new ThemeError('指定されたトークテーマが見つかりません。', 404);
    }
    throw error;
  }
}
