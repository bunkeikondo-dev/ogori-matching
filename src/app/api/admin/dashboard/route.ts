import { isSite } from '@/lib/validation';
import { requireAdmin } from '@/server/admin-auth';
import { errorResponse, jsonResponse, route } from '@/server/http';
import { getDashboard } from '@/server/queue-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async (request) => {
  const denied = requireAdmin(request);
  if (denied) {
    return denied;
  }
  const site = request.nextUrl.searchParams.get('site');
  if (!isSite(site)) {
    return errorResponse('マッチングシステムの指定が不正です。', 400);
  }
  return jsonResponse(await getDashboard(site, new Date()));
});
