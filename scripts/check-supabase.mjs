import { loadEnvFile } from "node:process";
try {
  loadEnvFile(".env.local");
} catch {
  /* CI may supply variables. */
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error(
    "缺少 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY，尚未检查连接。",
  );
  process.exitCode = 1;
} else if (key.startsWith("sb_secret_")) {
  console.error(
    "检测到 Secret Key，不能放入 NEXT_PUBLIC 变量。请改填 Publishable Key。",
  );
  process.exitCode = 1;
} else {
  for (const [label, path] of [
    ["auth_health", "/auth/v1/health"],
    ["auth_settings", "/auth/v1/settings"],
    ["database_schema", "/rest/v1/profiles?select=user_id&limit=0"],
  ]) {
    try {
      const response = await fetch(new URL(path, url), {
        headers: { apikey: key },
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      console.log(
        JSON.stringify({
          check: label,
          http_status: response.status,
          code: data.code,
          signup_disabled: data.disable_signup,
          email_enabled: data.external?.email,
          email_confirmation_required:
            data.mailer_autoconfirm === undefined
              ? undefined
              : !data.mailer_autoconfirm,
        }),
      );
      // Anonymous profiles access should be denied; missing-table errors are not a connected-schema pass.
      if (label === "database_schema") {
        if (!["42501"].includes(data.code)) {
          console.error(
            data.code === "PGRST205"
              ? "业务表尚未建立，请执行迁移。"
              : "匿名表访问未得到预期的权限拒绝，请审查 RLS/权限。",
          );
          process.exitCode = 1;
        }
      } else if (!response.ok) process.exitCode = 1;
    } catch (error) {
      console.error(
        JSON.stringify({
          check: label,
          error: error.cause?.code ?? error.name,
        }),
      );
      process.exitCode = 1;
    }
  }
}
