import { NextRequest, NextResponse } from 'next/server';
import { ApiError, service } from '@/backend/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function handle(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  if (
    request.method !== 'GET' &&
    request.headers.get('origin') &&
    request.headers.get('origin') !== request.nextUrl.origin
  )
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  try {
    const raw = request.method === 'GET' ? '' : await request.text();
    if (Buffer.byteLength(raw) > 16384)
      return NextResponse.json({ error: 'Request too large.' }, { status: 413 });
    const pathname = '/' + (await params).path.join('/');
    if (process.env.LAMBDA_API_URL) {
      const response = await fetch(process.env.LAMBDA_API_URL.replace(/\/$/, '') + pathname, {
        method: request.method,
        headers: {
          'content-type': 'application/json',
          cookie: request.headers.get('cookie') || '',
          'x-api-key': process.env.LAMBDA_API_KEY || '',
        },
        ...(request.method !== 'GET' ? { body: raw } : {}),
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      });
      const result = new NextResponse(await response.text(), {
        status: response.status,
        headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      });
      const cookie = response.headers.get('set-cookie');
      if (cookie) result.headers.set('set-cookie', cookie);
      return result;
    }
    if (process.env.NODE_ENV === 'production')
      return NextResponse.json(
        { error: 'Backend is not configured. Set LAMBDA_API_URL and LAMBDA_API_KEY.' },
        { status: 503 },
      );
    const body = request.method === 'GET' ? {} : JSON.parse(raw);
    const result = await service(
      request.method,
      pathname,
      body,
      request.headers.get('cookie') || '',
    );
    return NextResponse.json(result.body, {
      status: result.status,
      headers: {
        'cache-control': 'no-store',
        ...(result.cookie ? { 'set-cookie': result.cookie } : {}),
      },
    });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof SyntaxError)
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
export { handle as GET, handle as POST };
