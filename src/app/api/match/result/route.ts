import { errorResponse, jsonResponse, route } from '@/server/http';
import { getMatchResult } from '@/server/queue-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** 本人(entryId + token)のみ、成立したマッチの結果を再取得できる */
export const GET = route(async (request) => {
  const entryId = request.nextUrl.searchParams.get('entryId') ?? '';
  const token = request.nextUrl.searchParams.get('token') ?? '';

  if (!entryId || !token || entryId.length > 100 || token.length > 200) {
    return errorResponse('マッチ情報が見つかりません。', 404);
  }

  const result = await getMatchResult(entryId, token);
  if (!result) {
    return errorResponse('マッチ情報が見つかりません。', 404);
  }
  return jsonResponse(result);
});
