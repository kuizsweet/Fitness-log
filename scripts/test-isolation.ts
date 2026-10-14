import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
import { loadEnvFile } from "node:process";
import { diagnosticFetch } from "./diagnostic-fetch";
import { mkdir, writeFile } from "node:fs/promises";
try {
  loadEnvFile(".env.local");
} catch {
  /* CI can supply environment variables. */
}
async function main() {
  const names = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "TEST_USER_A_EMAIL",
    "TEST_USER_A_PASSWORD",
    "TEST_USER_B_EMAIL",
    "TEST_USER_B_PASSWORD",
  ];
  for (const n of names)
    if (!process.env[n])
      throw new Error(`缺少 ${n}。请使用两名已验证邮箱的测试用户。`);
  const make = () =>
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: diagnosticFetch },
      },
    );
  const a = make(),
    b = make();
  const ra = await a.auth.signInWithPassword({
    email: process.env.TEST_USER_A_EMAIL!,
    password: process.env.TEST_USER_A_PASSWORD!,
  });
  const rb = await b.auth.signInWithPassword({
    email: process.env.TEST_USER_B_EMAIL!,
    password: process.env.TEST_USER_B_PASSWORD!,
  });
  assert.ifError(ra.error);
  assert.ifError(rb.error);
  const uidA = ra.data.user!.id,
    uidB = rb.data.user!.id;
  assert.notEqual(uidA, uidB, "测试必须使用不同账号");
  const ex = crypto.randomUUID(),
    equipment = crypto.randomUUID(),
    session = crypto.randomUUID(),
    own = crypto.randomUUID(),
    meal = crypto.randomUUID(),
    photo = crypto.randomUUID(),
    path = `${uidA}/${meal}/${photo}.jpg`;
  const manifest = `test-results/supabase-${session}.json`;
  await mkdir("test-results", { recursive: true });
  await writeFile(
    manifest,
    JSON.stringify(
      {
        owner: uidA,
        second_owner: uidB,
        exercise: ex,
        equipment,
        session,
        second_session: own,
        meal,
        photo,
        storage_path: path,
        created_at: new Date().toISOString(),
        status: "running",
      },
      null,
      2,
    ),
  );
  let passed = false;
  try {
    const insert = await a
      .from("exercises")
      .insert({ id: ex, user_id: uidA, name: "隔离测试-临时动作" });
    assert.ifError(insert.error);
    const eq = await a.from("equipment").insert({
      id: equipment,
      user_id: uidA,
      name: "隔离测试-临时器材",
      type: "smith",
      rule: "per_side",
      initial_weight: null,
    });
    assert.ifError(eq.error);
    const { newSet, newSession } = await import("../src/lib/domain");
    const record = { ...newSession("2000-01-01"), id: session };
    const set = newSet("kg", "per_side");
    set.weight = { ...set.weight, left: 5, right: 7.5, base: null };
    set.reps = 8;
    record.exercises = [
      {
        id: crypto.randomUUID(),
        exercise_id: ex,
        equipment_id: equipment,
        exercise_name: "隔离测试-临时动作",
        muscle_group: "",
        equipment_snapshot: {
          id: equipment,
          name: "隔离测试-临时器材",
          type: "smith",
          rule: "per_side",
          unit: "kg",
          initial_weight: null,
          increments: [],
          notes: "",
          hidden: false,
        },
        notes: "临时验证",
        sets: [set],
      },
    ];
    const saved = await a.rpc("save_workout", { payload: record });
    assert.ifError(saved.error);
    const read = await a
      .from("workout_sets")
      .select("weight,reps")
      .eq("id", set.id)
      .single();
    assert.ifError(read.error);
    assert.equal(read.data!.reps, 8);
    assert.equal(read.data!.weight.base, null);
    const updated = await a
      .from("workout_sets")
      .update({ reps: 9 })
      .eq("id", set.id)
      .select("reps")
      .single();
    assert.ifError(updated.error);
    assert.equal(updated.data!.reps, 9);
    const lookup = await b
      .from("workout_sessions")
      .select("*")
      .eq("id", session);
    assert.ifError(lookup.error);
    assert.equal(lookup.data!.length, 0);
    const edit = await b
      .from("workout_sessions")
      .update({ notes: "不应写入" })
      .eq("id", session)
      .select();
    assert.ifError(edit.error);
    assert.equal(edit.data!.length, 0);
    const forge = await b
      .from("exercises")
      .insert({ user_id: uidA, name: "不应创建" });
    assert.equal(forge.error?.code, "42501");
    const ownSession = await b.from("workout_sessions").insert({
      id: own,
      user_id: uidB,
      training_date: "2000-01-01",
      status: "completed",
    });
    assert.ifError(ownSession.error);
    try {
      const cross = await b.from("workout_exercises").insert({
        user_id: uidB,
        session_id: own,
        exercise_id: ex,
        position: 0,
        exercise_name: "跨用户",
      });
      assert.equal(cross.error?.code, "23503");
    } finally {
      await b.from("workout_sessions").delete().eq("id", own);
    }
    const m = await a.from("meal_entries").insert({
      id: meal,
      user_id: uidA,
      meal_date: "2000-01-01",
      meal_type: "breakfast",
    });
    assert.ifError(m.error);
    const sharp = (await import("sharp")).default;
    const bytes = await sharp({
      create: { width: 1, height: 1, channels: 3, background: "#fff" },
    })
      .jpeg()
      .toBuffer();
    const upload = await a.storage
      .from("meal-photos")
      .upload(path, bytes, { contentType: "image/jpeg" });
    assert.ifError(upload.error);
    const photoRow = await a.from("meal_photos").insert({
      id: photo,
      user_id: uidA,
      meal_id: meal,
      storage_path: path,
      original_name: "isolation-test.jpg",
      mime_type: "image/jpeg",
      byte_size: bytes.length,
    });
    assert.ifError(photoRow.error);
    const hiddenPhoto = await b
      .from("meal_photos")
      .select("id")
      .eq("id", photo);
    assert.ifError(hiddenPhoto.error);
    assert.equal(hiddenPhoto.data!.length, 0);
    const ownerDownload = await a.storage.from("meal-photos").download(path);
    assert.ifError(ownerDownload.error);
    assert.deepEqual(
      Buffer.from(await ownerDownload.data!.arrayBuffer()),
      bytes,
    );
    const sign = await b.storage.from("meal-photos").createSignedUrl(path, 60);
    assert.ok(
      [400, 403, 404].includes(Number(sign.error?.status)),
      "另一账号必须被 Storage 服务拒绝，网络错误不算隔离通过",
    );
    const badUpload = await b.storage
      .from("meal-photos")
      .upload(`${uidA}/${meal}/cross.jpg`, bytes, {
        contentType: "image/jpeg",
      });
    assert.ok(
      [400, 403].includes(Number(badUpload.error?.status)),
      "跨用户上传必须得到明确权限错误",
    );
    const ownerSign = await a.storage
      .from("meal-photos")
      .createSignedUrl(path, 60);
    assert.ifError(ownerSign.error);
    const signedDownload = await diagnosticFetch(ownerSign.data!.signedUrl);
    assert.equal(signedDownload.status, 200);
    assert.deepEqual(Buffer.from(await signedDownload.arrayBuffer()), bytes);
    const publicUrl = a.storage.from("meal-photos").getPublicUrl(path)
      .data.publicUrl;
    const publicDownload = await diagnosticFetch(publicUrl);
    assert.equal(
      publicDownload.ok,
      false,
      "私有照片不能通过永久 public URL 读取",
    );
    passed = true;
  } finally {
    const cleanup = [
      await a.storage.from("meal-photos").remove([path]),
      await a.from("meal_entries").delete().eq("id", meal),
      await a.from("workout_sessions").delete().eq("id", session),
      await a.from("equipment").delete().eq("id", equipment),
      await a.from("exercises").delete().eq("id", ex),
      await b.from("workout_sessions").delete().eq("id", own),
    ];
    cleanup.forEach((r) => {
      if (r.error) console.error("测试清理失败：", r.error.message);
    });
    await a.auth.signOut({ scope: "local" });
    await b.auth.signOut({ scope: "local" });
    if (cleanup.some((r) => r.error))
      throw new Error(
        "临时记录清理未完成，清单保存在 test-results，不能报告测试通过。",
      );
    await writeFile(
      manifest,
      JSON.stringify(
        {
          status: passed ? "passed_and_cleaned" : "failed_and_cleaned",
          completed_at: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
  }
  if (passed)
    console.log(
      "真实 Supabase 验证通过：双账号密码登录、训练/器材/组真实读写、跨账号 RLS/外键拒绝、私有照片数据库关联及 bytes 上传下载、公开 URL 拒绝；自身临时记录已清理。",
    );
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
