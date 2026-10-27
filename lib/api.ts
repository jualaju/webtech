export async function api<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api' + path, {
    method: body ? 'POST' : 'GET',
    ...(body
      ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
      : {}),
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Request failed.');
  return payload as T;
}
