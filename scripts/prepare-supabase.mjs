import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
export const businessTables = [
  "profiles",
  "exercises",
  "equipment",
  "workout_sessions",
  "workout_exercises",
  "workout_sets",
  "meal_entries",
  "meal_photos",
  "import_batches",
  "import_previews",
  "daily_checkins",
  "checkin_preferences",
];
export async function migrationBundle() {
  const files = (await readdir("supabase/migrations"))
    .filter((f) => /^\d+_[a-z_]+\.sql$/.test(f))
    .sort();
  const pieces = [
    `-- Generated from checked-in migrations. Never reset or drop existing data.
begin;
select pg_advisory_xact_lock(hashtext('fitness_journal_schema'));
create schema if not exists fitness_journal_meta;
revoke all on schema fitness_journal_meta from public,anon,authenticated;
create table if not exists fitness_journal_meta.migrations(version text primary key,checksum text not null,applied_at timestamptz not null default now());
revoke all on table fitness_journal_meta.migrations from public,anon,authenticated;`,
  ];
  for (const file of files) {
    const sql = await readFile(`supabase/migrations/${file}`, "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const version = file.split("_")[0];
    const delimiter = `$fj_migration_${version}$`;
    if (sql.includes(delimiter)) throw new Error("迁移 SQL 分隔符冲突");
    const guard =
      version === "202610130001"
        ? `if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in (${businessTables.map((t) => `'${t}'`).join(",")})) then raise exception '已有业务表但没有迁移记录：为保留数据已停止，请先运行 supabase/inspect.sql 核对，不要重建表'; end if;`
        : "";
    pieces.push(`do $fj_apply$ begin
if exists(select 1 from fitness_journal_meta.migrations where version='${version}') then
 if not exists(select 1 from fitness_journal_meta.migrations where version='${version}' and checksum='${checksum}') then raise exception '迁移 ${version} 校验和不匹配，已停止'; end if;
else
${guard ? ` ${guard}` : ""}
 execute ${delimiter}\n${sql}\n${delimiter};
 insert into fitness_journal_meta.migrations(version,checksum) values('${version}','${checksum}');
end if; end $fj_apply$;`);
  }
  pieces.push(`commit;
notify pgrst, 'reload schema';
select version,applied_at from fitness_journal_meta.migrations order by version;`);
  return pieces.join("\n\n");
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("/prepare-supabase.mjs")) {
  async function prepare() {
    await mkdir("supabase", { recursive: true });
    await writeFile("supabase/setup.sql", await migrationBundle());
    console.log(
      "已生成 supabase/setup.sql：事务执行、重复跳过、已有未登记表时停止。",
    );
  }
  prepare().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
