import { requireAdmin } from '@/server/admin-auth';
import { errorResponse, jsonResponse, readJson, route } from '@/server/http';
import { createTheme, isThemeCategory, listThemes, ThemeError, validateThemeText } from '@/server/theme-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** ライトトーク・じっくりトーク両方をまとめて返す（画面側でタブ分けする） */
export const GET = route(async (request) => {
  const denied = requireAdmin(request);
  if (denied) {
    return denied;
  }
  return jsonResponse({ themes: await listThemes() });
});

export const POST = route(async (request) => {
  const denied = requireAdmin(request);
  if (denied) {
    return denied;
  }

  const body = await readJson(request);
  const record = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  const category = record.category;
  if (!isThemeCategory(category)) {
    return errorResponse('カテゴリ（ライトトーク／じっくりトーク）を指定してください。', 400);
  }
  const validation = validateThemeText(record.text);
  if (!validation.ok) {
    return errorResponse(validation.message, 400);
  }

  try {
    const theme = await createTheme(category, validation.text);
    return jsonResponse({ theme }, 201);
  } catch (error) {
    if (error instanceof ThemeError) {
      return errorResponse(error.message, error.status);
    }
    throw error;
  }
});
