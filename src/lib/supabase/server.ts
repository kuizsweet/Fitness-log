import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { config } from "./config";
import { supabaseFetch } from "./transport";
export async function serverClient() {
  const store = await cookies();
  const { url, key } = config();
  return createServerClient(url, key, {
    global: { fetch: supabaseFetch },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (items) => {
        try {
          items.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
        } catch {
          /* Server components cannot write cookies; proxy refreshes them. */
        }
      },
    },
  });
}
