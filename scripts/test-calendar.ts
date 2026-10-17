import assert from "node:assert/strict";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { diagnosticFetch } from "./diagnostic-fetch";
import { newSession, type Session } from "../src/lib/domain";
import { trainingMarkers } from "../src/lib/calendar";
async function main() {
  const required = (name: string) => {
    if (!process.env[name]) throw new Error(`本地缺少 ${name}`);
    return process.env[name]!;
  };
  const origin = process.env.TEST_APP_URL ?? "http://localhost:3000";
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
  const jars = [
    new Map<string, { value: string; options: CookieOptions }>(),
    new Map<string, { value: string; options: CookieOptions }>(),
  ];
  const clients = jars.map((jar) =>
    createServerClient(
      required("NEXT_PUBLIC_SUPABASE_URL"),
      required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
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
    ),
  );
  const ids: string[] = [],
    created: string[] = [];
  const dbUrl = new URL(required("SUPABASE_DB_URL"));
  for (const param of ["sslmode", "sslcert", "sslkey", "sslrootcert"])
    dbUrl.searchParams.delete(param);
  const admin = new pg.Client({
    connectionString: dbUrl.toString(),
    ssl: {
      ca: await readFile(required("SUPABASE_DB_CA_FILE"), "utf8"),
      rejectUnauthorized: true,
    },
    connectionTimeoutMillis: 12000,
  });
  await admin.connect();
  async function request(i: number, path: string, data?: unknown) {
    const response = await fetch(`${origin}/api/${path}`, {
      method: data ? "POST" : "GET",
      headers: {
        Cookie: [...jars[i]]
          .map(([name, c]) => `${name}=${c.value}`)
          .join("; "),
        Origin: origin,
        "Content-Type": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(30000),
    });
    assert.equal(response.status, 200, path);
    return response.json();
  }
  try {
    for (let i = 0; i < 2; i++) {
      const signed = await clients[i].auth.signInWithPassword({
        email: required(`TEST_USER_${i === 0 ? "A" : "B"}_EMAIL`),
        password: required(`TEST_USER_${i === 0 ? "A" : "B"}_PASSWORD`),
      });
      assert.ifError(signed.error);
      ids.push(signed.data.user!.id);
    }
    assert.notEqual(ids[0], ids[1]);
    const date = "2024-02-29";
    const strength: Session = {
      ...newSession(date),
      training_type: "strength",
      notes: "temporary calendar verification",
    };
    const cardio: Session = {
      ...newSession(date),
      training_type: "cardio",
      notes: "temporary calendar verification",
    };
    for (const row of [strength, cardio]) {
      created.push(row.id);
      row.revision = (await request(0, "sessions", row)).revision;
    }
    const query = `sessions?from=${date}&to=${date}`;
    const rows: Session[] = (await request(0, query)).filter((s: Session) =>
      created.includes(s.id),
    );
    assert.deepEqual(trainingMarkers(rows, date), ["strength", "cardio"]);
    assert.ok(
      !(await request(1, query)).some((s: Session) => created.includes(s.id)),
    );
    delete strength.training_type;
    strength.revision = (await request(0, "sessions", strength)).revision;
    assert.equal(
      (await request(0, query)).find((s: Session) => s.id === strength.id)
        .training_type,
      "strength",
    );
    // An invalid signature must fail even with otherwise valid session metadata.
    const cookieName = [...jars[0].keys()]
      .find((name) => name.includes("-auth-token"))!
      .replace(/\.\d+$/, "");
    const encoded = [...jars[0]]
      .filter(
        ([name]) => name === cookieName || name.startsWith(cookieName + "."),
      )
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, c]) => c.value)
      .join("");
    assert.ok(encoded.startsWith("base64-"));
    const fake = JSON.parse(
      Buffer.from(encoded.slice(7), "base64url").toString(),
    );
    const parts = fake.access_token.split(".");
    parts[2] = (parts[2][0] === "A" ? "B" : "A") + parts[2].slice(1);
    fake.access_token = parts.join(".");
    const forged = await fetch(`${origin}/api/profile`, {
      headers: {
        Cookie: `${cookieName}=base64-${Buffer.from(JSON.stringify(fake)).toString("base64url")}`,
      },
      signal: AbortSignal.timeout(30000),
    });
    assert.equal(forged.status, 401, "伪造签名必须被拒绝");
    console.log(
      "真实日历基础验证通过：力量/有氧分类保存并读回，双标记，旧客户端保留分类，账号隔离，伪造签名拒绝。",
    );
  } finally {
    if (created.length && ids[0])
      await admin.query(
        "delete from public.workout_sessions where user_id=$1 and id=any($2::uuid[])",
        [ids[0], created],
      );
    await admin.end();
    await Promise.all(clients.map((c) => c.auth.signOut({ scope: "local" })));
    console.log("已清理本次精确 UUID 测试训练，原有记录保留。");
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "日历验证失败");
  process.exitCode = 1;
});
