import { createServerClient, type CookieOptions } from "@supabase/ssr";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { diagnosticFetch } from "./diagnostic-fetch";
import { today } from "../src/lib/domain";
import { calendarMonth } from "../src/lib/calendar";

async function main() {
  const phase = process.argv[2] ?? "after";
  assert.ok(["before", "after", "cold"].includes(phase));
  const origin = process.env.TEST_APP_URL ?? "http://localhost:3000";
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
  const jar = new Map<string, { value: string; options: CookieOptions }>();
  const db = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { fetch: diagnosticFetch },
      cookies: {
        getAll: () => [...jar].map(([name, c]) => ({ name, value: c.value })),
        setAll: (items) =>
          items.forEach(({ name, value, options }) =>
            value ? jar.set(name, { value, options }) : jar.delete(name),
          ),
      },
    },
  );
  const signed = await db.auth.signInWithPassword({
    email: process.env.TEST_USER_A_EMAIL!,
    password: process.env.TEST_USER_A_PASSWORD!,
  });
  assert.ifError(signed.error);
  const algorithm = JSON.parse(
    Buffer.from(
      signed.data.session!.access_token.split(".")[0],
      "base64url",
    ).toString(),
  ).alg;
  const timings: {
    path: string;
    round: number;
    ttfb_ms: number;
    total_ms: number;
  }[] = [];
  const date = today("Asia/Shanghai");
  const month = calendarMonth(date);
  const paths = ["/dashboard", "/catalog", "/config", "/api/profile"];
  if (process.argv.includes("--full"))
    paths.push(
      `/api/sessions?from=${month.from}&to=${month.to}`,
      `/api/meals?date=${date}`,
      "/api/checkins",
      "/api/catalog",
    );
  try {
    for (let round = 1; round <= 2; round++) {
      await Promise.all(
        paths.map(async (path) => {
          const start = performance.now();
          const response = await fetch(origin + path, {
            headers: {
              Cookie: [...jar]
                .map(([name, c]) => `${name}=${c.value}`)
                .join("; "),
            },
            cache: "no-store",
            signal: AbortSignal.timeout(30000),
          });
          const ttfb = performance.now() - start;
          assert.equal(response.status, 200, path);
          await response.text();
          timings.push({
            path,
            round,
            ttfb_ms: Math.round(ttfb),
            total_ms: Math.round(performance.now() - start),
          });
        }),
      );
    }
    await mkdir("test-results", { recursive: true });
    await writeFile(
      `test-results/navigation-${phase}.json`,
      JSON.stringify({ phase, origin, algorithm, timings }, null, 2),
    );
    console.log(JSON.stringify({ phase, origin, algorithm, timings }, null, 2));
  } finally {
    await db.auth.signOut({ scope: "local" });
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "测量失败");
  process.exitCode = 1;
});
