import { timingSafeEqual } from 'node:crypto';
import { ApiError, service } from './service';
type Event = {
  rawPath: string;
  headers: Record<string, string>;
  cookies?: string[];
  body?: string;
  isBase64Encoded?: boolean;
  requestContext: { http: { method: string } };
};
export async function handler(event: Event) {
  const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' };
  const key = event.headers['x-api-key'] || '',
    expected = process.env.API_KEY || '';
  if (
    !expected ||
    Buffer.byteLength(key) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(key), Buffer.from(expected))
  )
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden' }) };
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString()
      : event.body;
    if (raw && Buffer.byteLength(raw) > 16384) throw new ApiError(413, 'Request too large.');
    const result = await service(
      event.requestContext.http.method,
      event.rawPath,
      raw ? JSON.parse(raw) : {},
      event.cookies?.join('; ') || event.headers.cookie || '',
    );
    return {
      statusCode: result.status,
      headers,
      body: JSON.stringify(result.body),
      ...(result.cookie ? { cookies: [result.cookie] } : {}),
    };
  } catch (e) {
    if (!(e instanceof ApiError) && !(e instanceof SyntaxError)) console.error(e);
    return {
      statusCode: e instanceof ApiError ? e.status : e instanceof SyntaxError ? 400 : 500,
      headers,
      body: JSON.stringify({
        error:
          e instanceof ApiError
            ? e.message
            : e instanceof SyntaxError
              ? 'Invalid JSON.'
              : 'Something went wrong. Please try again.',
      }),
    };
  }
}
