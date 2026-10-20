import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
if (!existsSync("node_modules/next/dist/bin/next")) {
  console.error("缺少项目依赖，请在项目目录运行 npm install 后再次双击启动。");
  process.exit(1);
}
if (!existsSync(".env.local")) {
  console.error("缺少 .env.local 本地配置，请恢复项目配置文件后重试。");
  process.exit(1);
}

const url = "http://localhost:3003/dashboard";
console.log(
  `正在启动 kuizFit：${url}\n窗口保持打开即可使用；按 Ctrl+C 停止服务。`,
);
const server = spawn(
  process.execPath,
  [
    "scripts/with-env.mjs",
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "0.0.0.0",
    "--port",
    "3003",
  ],
  { cwd: root, env: process.env, stdio: ["inherit", "pipe", "inherit"] },
);

let opened = false;
let output = "";
server.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  output = (output + chunk.toString()).slice(-2048);
  if (!opened && /Ready in\s/.test(output)) {
    opened = true;
    // Open only after this server reports readiness, never a conflicting service.
    const browser = spawn("cmd.exe", ["/d", "/c", "start", "", url], {
      windowsHide: true,
      stdio: "ignore",
    });
    browser.on("error", () => console.log(`请手动打开 ${url}`));
  }
});
server.on("error", (error) => {
  console.error(`无法启动服务：${error.message}`);
  process.exitCode = 1;
});
server.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
process.on("SIGINT", () => server.kill("SIGINT"));
process.on("SIGTERM", () => server.kill("SIGTERM"));
