import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { config as serviceConfig, configured } from "./lib/supabase/config";
import { supabaseFetch } from "./lib/supabase/transport";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!configured()) return response;
  const { url, key } = serviceConfig();
  const client = createServerClient(url, key, {
    global: { fetch: supabaseFetch },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  // Refresh cookie storage only. This result never authorizes a request.
  // The private layout verifies signed claims before mounting data consumers;
  // every API independently verifies claims/getUser and applies RLS.
  await client.auth.getSession();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  // Route handlers refresh their own cookies and authenticate in context().
  matcher: [
    "/((?!api(?:/|$)|brand(?:/|$)|_next/static|_next/image|favicon.ico).*)",
  ],
};
