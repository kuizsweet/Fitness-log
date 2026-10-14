import { loadEnvFile } from "node:process";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { migrationBundle, businessTables } from "./prepare-supabase.mjs";
try {
  loadEnvFile(".env.local");
} catch {
  /* CI may supply variables. */
}
const apply = process.argv.includes("--apply");
const raw = process.env.SUPABASE_DB_URL;
if (!raw) {
  console.error(
    "未执行迁移：请在本地 .env.local 配置 SUPABASE_DB_URL（Session pooler / 5432），不需要发送到聊天。",
  );
  process.exitCode = 1;
} else {
  let client;
  try {
    const url = new URL(raw);
    const projectHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
      .hostname;
    const projectRef = projectHost.split(".")[0];
    if (
      url.hostname.endsWith(".pooler.supabase.com") &&
      !decodeURIComponent(url.username).endsWith(`.${projectRef}`)
    )
      throw new Error("数据库连接的项目标识与 Project URL 不一致，已停止");
    if (
      url.hostname.endsWith(".supabase.co") &&
      url.hostname !== `db.${projectRef}.supabase.co`
    )
      throw new Error("数据库主机与 Project URL 不一致，已停止");
    if (!["postgres:", "postgresql:"].includes(url.protocol))
      throw new Error("连接串须为 PostgreSQL URL");
    if (url.port === "6543")
      throw new Error(
        "迁移使用 Session pooler / 5432，不能使用 Transaction pooler / 6543",
      );
    if (
      !url.hostname.endsWith(".supabase.co") &&
      !url.hostname.endsWith(".pooler.supabase.com")
    )
      throw new Error("数据库主机必须是 Supabase Connect 面板给出的官方主机");
    // pg's sslmode option can override explicit certificate validation: enforce verified TLS.
    for (const name of ["sslmode", "sslcert", "sslkey", "sslrootcert"])
      url.searchParams.delete(name);
    const ca = process.env.SUPABASE_DB_CA_FILE
      ? await readFile(process.env.SUPABASE_DB_CA_FILE, "utf8")
      : undefined;
    client = new pg.Client({
      connectionString: url.toString(),
      ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
      connectionTimeoutMillis: 12000,
      query_timeout: 45000,
      statement_timeout: 40000,
    });
    await client.connect();
    const existing = await client.query(
      "select tablename from pg_tables where schemaname='public' and tablename=any($1::text[]) order by tablename",
      [businessTables],
    );
    const registry = await client.query(
      "select to_regclass('fitness_journal_meta.migrations') as name",
    );
    console.log(
      JSON.stringify({
        database_connected: true,
        existing_app_tables: existing.rows.map((r) => r.tablename),
        migration_registry_present: Boolean(registry.rows[0].name),
      }),
    );
    if (apply) {
      await client.query(await migrationBundle());
      console.log("缺失迁移已事务提交，已有登记迁移已跳过。");
    }
    const rls = await client.query(
      "select c.relname as table_name,c.relrowsecurity as rls_enabled from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=any($1::text[]) order by c.relname",
      [businessTables],
    );
    const bucket = await client.query(
      "select id,public,file_size_limit,allowed_mime_types from storage.buckets where id='meal-photos'",
    );
    const policies = await client.query(
      "select schemaname,tablename,policyname,roles,cmd from pg_policies where (schemaname='public' and tablename=any($1::text[])) or (schemaname='storage' and tablename='objects') order by schemaname,tablename,policyname",
      [businessTables],
    );
    console.log(
      JSON.stringify({
        rls: rls.rows,
        bucket: bucket.rows,
        policies: policies.rows,
      }),
    );
    if (apply) {
      if (
        rls.rows.length !== businessTables.length ||
        rls.rows.some((r) => !r.rls_enabled)
      )
        throw new Error("迁移提交后 RLS 检查失败，请检查数据库配置");
      if (bucket.rows.length !== 1 || bucket.rows[0].public !== false)
        throw new Error("私有 Storage bucket 检查失败");
      const grants = await client.query(
        "select table_name,grantee,privilege_type from information_schema.role_table_grants where table_schema='public' and table_name=any($1::text[]) and (grantee in ('PUBLIC','anon') or (grantee='authenticated' and privilege_type not in ('SELECT','INSERT','UPDATE','DELETE')))",
        [businessTables],
      );
      if (grants.rows.length)
        throw new Error(
          "存在超出预期的数据库访问权限，请运行 supabase/inspect.sql 检查",
        );
      console.log(
        "真实数据库检查通过：10 张业务表启用 RLS，匿名无表权限，meal-photos 为私有 bucket。",
      );
    }
  } catch (error) {
    try {
      await client?.query("rollback");
    } catch {
      /* Failed connection / no active transaction. */
    }
    let password = "";
    try {
      password = new URL(raw).password;
    } catch {
      /* Invalid input must never be printed. */
    }
    const message = password
      ? String(error.message)
          .replaceAll(raw, "[数据库连接已隐藏]")
          .replaceAll(password, "[密码已隐藏]")
          .replaceAll(decodeURIComponent(password), "[密码已隐藏]")
      : "请检查数据库连接串格式、权限或网络；未输出原连接串。";
    console.error(`数据库操作失败（${error.code ?? error.name}）：${message}`);
    process.exitCode = 1;
  } finally {
    await client?.end();
  }
}
