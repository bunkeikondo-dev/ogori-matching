import { requireAdmin } from '@/server/admin-auth';
import { errorResponse, jsonResponse, readJson, route } from '@/server/http';
import { createTheme, listThemes, ThemeError, validateThemeText } from '@/server/theme-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
  const raw = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).text : undefined;
  const validation = validateThemeText(raw);
  if (!validation.ok) {
    return errorResponse(validation.message, 400);
  }

  try {
    const theme = await createTheme(validation.text);
    return jsonResponse({ theme }, 201);
  } catch (error) {
    if (error instanceof ThemeError) {
      return errorResponse(error.message, error.status);
    }
    throw error;
  }
});
