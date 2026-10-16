import test from "node:test";
import assert from "node:assert/strict";
import { preloadPublicKeys } from "../src/lib/supabase/claims";

test("公开公钥合并并发读取、严格过期且失败不使用旧缓存", async () => {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  const names = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NODE_USE_ENV_PROXY",
  ];
  const originalEnv = names.map((name) => process.env[name]);
  const shared = globalThis as typeof globalThis & {
    fitnessPublicKeys?: unknown;
  };
  delete shared.fitnessPublicKeys;
  let now = 1_000;
  let calls = 0;
  let fail = false;
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://keys.example.test";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "unit-test";
    process.env.NODE_USE_ENV_PROXY = "0";
    Date.now = () => now;
    globalThis.fetch = async (input, init) => {
      calls++;
      assert.equal(
        String(input),
        "https://keys.example.test/auth/v1/.well-known/jwks.json",
      );
      assert.equal(init?.cache, "no-store");
      assert.equal(init?.headers, undefined);
      return Response.json({ keys: [] }, { status: fail ? 503 : 200 });
    };
    await Promise.all([
      preloadPublicKeys(),
      preloadPublicKeys(),
      preloadPublicKeys(),
    ]);
    assert.equal(calls, 1);
    await preloadPublicKeys();
    assert.equal(calls, 1);
    now += 240_000;
    fail = true;
    await assert.rejects(preloadPublicKeys(true));
    assert.equal(calls, 2);
    await preloadPublicKeys();
    assert.equal(calls, 2, "预刷新失败不能使仍在有效期内的公钥失效");
    now += 60_001;
    fail = true;
    await assert.rejects(preloadPublicKeys());
    assert.equal(calls, 3, "预刷新失败不延长旧公钥有效期");
    fail = false;
    await preloadPublicKeys();
    assert.equal(calls, 4);
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
    names.forEach((name, i) =>
      originalEnv[i] === undefined
        ? delete process.env[name]
        : (process.env[name] = originalEnv[i]),
    );
    delete shared.fitnessPublicKeys;
  }
});
