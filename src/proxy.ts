import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { config as serviceConfig, configured } from "./lib/supabase/config";
import { verifiedClaims } from "./lib/supabase/claims";
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
  // Verify/refresh the signed token here; each page also checks its identity.
  await verifiedClaims(client);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  // Route handlers refresh their own cookies and authenticate in context().
  matcher: ["/((?!api(?:/|$)|_next/static|_next/image|favicon.ico).*)"],
};
