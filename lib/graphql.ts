/**
 * Frontend boundary for the NestJS/Apollo GraphQL API described in the project brief.
 * Set NEXT_PUBLIC_GRAPHQL_URL in Vercel when the backend is deployed.
 */
export async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const endpoint = process.env.NEXT_PUBLIC_GRAPHQL_URL || '/api/graphql';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length) throw new Error(payload.errors?.[0]?.message || 'GraphQL request failed');
  return payload.data as T;
}
