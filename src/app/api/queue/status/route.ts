import { jsonResponse, route } from '@/server/http';
import { getQueueStatus } from '@/server/queue-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async () => {
  return jsonResponse(await getQueueStatus());
});
