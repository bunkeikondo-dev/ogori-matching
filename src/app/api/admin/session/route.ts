import { isAdminRequest } from '@/server/admin-auth';
import { jsonResponse, route } from '@/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async (request) => {
  return jsonResponse({ authenticated: isAdminRequest(request) });
});
