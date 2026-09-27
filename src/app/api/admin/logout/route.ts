import { clearSessionCookie } from '@/server/admin-auth';
import { jsonResponse, route } from '@/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = route(async () => {
  const response = jsonResponse({ ok: true });
  clearSessionCookie(response);
  return response;
});
