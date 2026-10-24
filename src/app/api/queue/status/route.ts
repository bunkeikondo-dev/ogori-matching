import { jsonResponse, errorResponse, route } from '@/server/http';
import { isSite } from '@/lib/validation';
import { getQueueStatus } from '@/server/queue-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async (request) => {
  const site = request.nextUrl.searchParams.get('site');
  if (!isSite(site)) {
    return errorResponse('マッチングシステムの指定が不正です。', 400);
  }
  return jsonResponse(await getQueueStatus(site));
});
