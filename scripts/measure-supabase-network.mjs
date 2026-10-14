import { lookup } from "node:dns/promises";
import { performance } from "node:perf_hooks";
import http from "node:http";
import tls from "node:tls";

const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
const mode =
  process.env.NODE_USE_ENV_PROXY === "1"
    ? "existing-proxy"
    : "env-proxy-disabled";
const dnsStart = performance.now();
try {
  const addresses = await lookup(url.hostname, { all: true });
  console.log(
    JSON.stringify({
      mode,
      dns_ms: Math.round(performance.now() - dnsStart),
      addresses,
    }),
  );
} catch (error) {
  console.log(JSON.stringify({ mode, dns_error: error.code }));
}
if (process.argv.includes("--tunnel")) {
  const proxy = new URL(process.env.HTTPS_PROXY);
  if (!["127.0.0.1", "localhost"].includes(proxy.hostname) || proxy.username)
    throw new Error("此诊断只支持无认证的现有本地代理");
  await new Promise((resolve, reject) => {
    const start = performance.now();
    const request = http.request({
      host: proxy.hostname,
      port: proxy.port,
      method: "CONNECT",
      path: `${url.hostname}:443`,
    });
    const timer = setTimeout(() => {
      request.destroy();
      reject(new Error("Tunnel timeout"));
    }, 12000);
    request.on("error", reject);
    request.on("connect", (response, socket) => {
      const tunnelMs = Math.round(performance.now() - start);
      const secure = tls.connect({ socket, servername: url.hostname });
      secure.on("error", reject);
      secure.on("secureConnect", () => {
        console.log(
          JSON.stringify({
            mode,
            connect_status: response.statusCode,
            tunnel_ms: tunnelMs,
            tls_ms: Math.round(performance.now() - start) - tunnelMs,
            authorized: secure.authorized,
          }),
        );
        clearTimeout(timer);
        secure.destroy();
        resolve();
      });
    });
    request.end();
  });
  process.exit(0);
}
for (let round = 1; round <= 3; round++) {
  for (const path of ["/auth/v1/.well-known/jwks.json", "/auth/v1/health"]) {
    const start = performance.now();
    try {
      const response = await fetch(new URL(path, url), {
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      });
      await response.arrayBuffer();
      console.log(
        JSON.stringify({
          mode,
          round,
          path,
          status: response.status,
          ms: Math.round(performance.now() - start),
        }),
      );
    } catch (error) {
      console.log(
        JSON.stringify({
          mode,
          round,
          path,
          error: error.cause?.code ?? error.name,
          ms: Math.round(performance.now() - start),
        }),
      );
    }
  }
}
