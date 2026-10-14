import type { JWK, SupabaseClient } from "@supabase/supabase-js";
import { config } from "./config";
import { supabaseFetch } from "./transport";

type PublicKeys = { keys: JWK[] };
type KeyCache = {
  url: string;
  expires: number;
  keys?: PublicKeys;
  pending?: Promise<PublicKeys>;
};
const shared = globalThis as typeof globalThis & {
  fitnessPublicKeys?: KeyCache;
};

// Only public verification keys are shared; never sessions or user data.
export async function preloadPublicKeys() {
  const { url } = config();
  if (shared.fitnessPublicKeys?.url !== url)
    shared.fitnessPublicKeys = { url, expires: 0 };
  const cache = shared.fitnessPublicKeys;
  if (cache.keys && Date.now() < cache.expires) return cache.keys;
  if (cache.pending) return cache.pending;
  const started = Date.now();
  cache.pending = (async () => {
    const response = await supabaseFetch(`${url}/auth/v1/.well-known/jwks.json`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("公开验证公钥加载失败");
    const data = await response.json();
    if (!Array.isArray(data.keys)) throw new Error("公开验证公钥格式无效");
    cache.keys = data;
    // Strict five-minute expiry, including download time; no stale fallback.
    cache.expires = started + 5 * 60 * 1000;
    return data as PublicKeys;
  })();
  try {
    return await cache.pending;
  } finally {
    cache.pending = undefined;
  }
}

export async function verifiedClaims(db: SupabaseClient) {
  const { data, error } = await db.auth.getSession();
  // Reading a session only decides whether to load keys; it never authorizes.
  if (error || !data.session) return db.auth.getClaims();
  try {
    const jwks = await preloadPublicKeys();
    return await db.auth.getClaims(undefined, { jwks });
  } catch {
    // Official SDK still verifies/refreshes normally if preloading fails.
    return db.auth.getClaims();
  }
}
