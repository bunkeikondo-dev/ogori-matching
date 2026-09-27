import { requireAdmin } from '@/server/admin-auth';
import { errorResponse, jsonResponse, readJson, route } from '@/server/http';
import { deleteTheme, ThemeError, updateTheme, validateThemeText } from '@/server/theme-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) {
    return null;
  }
  const id = Number.parseInt(raw, 10);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export const PUT = route<Context>(async (request, context) => {
  const denied = requireAdmin(request);
  if (denied) {
    return denied;
  }

  const id = parseId((await context.params).id);
  if (id === null) {
    return errorResponse('トークテーマIDが不正です。', 400);
  }

  const body = await readJson(request);
  const raw = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).text : undefined;
  const validation = validateThemeText(raw);
  if (!validation.ok) {
    return errorResponse(validation.message, 400);
  }

  try {
    const theme = await updateTheme(id, validation.text);
    return jsonResponse({ theme });
  } catch (error) {
    if (error instanceof ThemeError) {
      return errorResponse(error.message, error.status);
    }
    throw error;
  }
});

export const DELETE = route<Context>(async (request, context) => {
  const denied = requireAdmin(request);
  if (denied) {
    return denied;
  }

  const id = parseId((await context.params).id);
  if (id === null) {
    return errorResponse('トークテーマIDが不正です。', 400);
  }

  try {
    await deleteTheme(id);
    return jsonResponse({ ok: true });
  } catch (error) {
    if (error instanceof ThemeError) {
      return errorResponse(error.message, error.status);
    }
    throw error;
  }
});
