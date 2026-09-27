import { requireAdmin } from '@/server/admin-auth';
import { jsonResponse, route } from '@/server/http';
import { getDashboard } from '@/server/queue-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async (request) => {
  const denied = requireAdmin(request);
  if (denied) {
    return denied;
  }
  return jsonResponse(await getDashboard(new Date()));
});
