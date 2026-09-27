import { getServiceStatus } from '@/server/service-hours';
import { jsonResponse, route } from '@/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async () => {
  return jsonResponse(getServiceStatus(new Date()));
});
