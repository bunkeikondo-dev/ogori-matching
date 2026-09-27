import { isAdminConfigured, setSessionCookie, verifyPasscode } from '@/server/admin-auth';
import { errorResponse, getClientIp, jsonResponse, readJson, route } from '@/server/http';
import { clearLoginFailures, isLoginBlocked, recordLoginFailure } from '@/server/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = route(async (request) => {
  if (!isAdminConfigured()) {
    return errorResponse('管理画面のパスコードが設定されていません。ADMIN_PASSCODE を設定してください。', 500);
  }

  const ip = getClientIp(request);
  if (await isLoginBlocked(ip)) {
    return errorResponse('試行回数が上限に達しました。しばらくしてから再度お試しください。', 429);
  }

  const body = await readJson(request);
  const passcode =
    typeof body === 'object' && body !== null && typeof (body as Record<string, unknown>).passcode === 'string'
      ? ((body as Record<string, unknown>).passcode as string)
      : '';

  if (!passcode.trim()) {
    return errorResponse('パスコードを入力してください', 400);
  }
  if (passcode.length > 200) {
    return errorResponse('パスコードが正しくありません', 401);
  }

  if (!verifyPasscode(passcode)) {
    await recordLoginFailure(ip);
    return errorResponse('パスコードが正しくありません', 401);
  }

  await clearLoginFailures(ip);
  const response = jsonResponse({ ok: true });
  setSessionCookie(response);
  return response;
});
