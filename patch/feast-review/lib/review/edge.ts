// Server-only helper for calling Supabase Edge Functions from the Next.js
// route handlers under app/api/review/*.
//
// Why proxy through our own API routes instead of calling the Edge Functions
// directly from the browser? supabase/functions/_shared/cors.ts locks
// Access-Control-Allow-Origin to a single ALLOWED_ORIGIN (defaulting to
// https://review.feastdininggroup.com). Calling from a Vercel preview/prod
// domain that doesn't match would be silently blocked by CORS. Routing
// through same-origin Next.js API routes sidesteps that entirely — the
// browser talks to our own domain, and the server-to-server call to Supabase
// isn't subject to CORS at all.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

export interface EdgeResult<T = any> {
  status: number;
  data: T;
}

export async function callEdgeFunction<T = any>(
  name: string,
  body: unknown
): Promise<EdgeResult<T>> {
  const resp = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await resp.json().catch(() => ({}))) as T;
  return { status: resp.status, data };
}

export async function callEdgeFunctionForm<T = any>(
  name: string,
  form: FormData
): Promise<EdgeResult<T>> {
  const resp = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
    },
    body: form,
    cache: "no-store",
  });
  const data = (await resp.json().catch(() => ({}))) as T;
  return { status: resp.status, data };
}
