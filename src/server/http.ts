import { NextResponse, type NextRequest } from 'next/server';

export function jsonResponse(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function errorResponse(message: string, status: number, extra?: Record<string, unknown>): NextResponse {
  return jsonResponse({ error: message, ...(extra ?? {}) }, status);
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/** Route Handlerの共通エラーハンドリング */
export function route<Ctx = unknown>(handler: (request: NextRequest, context: Ctx) => Promise<Response>) {
  return async (request: NextRequest, context: Ctx): Promise<Response> => {
    try {
      return await handler(request, context);
    } catch (error) {
      console.error('[api] 予期しないエラー', error);
      return errorResponse('サーバーエラーが発生しました。時間をおいて再度お試しください。', 500);
    }
  };
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}
