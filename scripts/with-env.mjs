import { loadEnvFile } from "node:process";
import { spawn } from "node:child_process";
try {
  loadEnvFile(".env.local");
} catch (error) {
  if (error.code !== "ENOENT") throw new Error("无法读取本地环境配置");
}
// Environment must exist before Node initializes fetch/proxy agents.
// Avoid --env-file flags: Next's dev worker forwards execArgv into NODE_OPTIONS.
const args = process.argv.slice(2);
const withoutProxy = args[0] === "--without-proxy";
if (withoutProxy) args.shift();
if (!args.length) throw new Error("请指定要执行的 Node 脚本");
const child = spawn(process.execPath, args, {
  env: withoutProxy
    ? {
        ...process.env,
        HTTP_PROXY: "",
        HTTPS_PROXY: "",
        ALL_PROXY: "",
        http_proxy: "",
        https_proxy: "",
        all_proxy: "",
        NODE_USE_ENV_PROXY: "0",
      }
    : process.env,
  stdio: "inherit",
});
child.on("error", (error) => {
  console.error(`进程启动失败：${error.code ?? error.name}`);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
