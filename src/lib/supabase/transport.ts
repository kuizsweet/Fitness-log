import { EnvHttpProxyAgent } from "undici";

const shared = globalThis as typeof globalThis & {
  fitnessProxyDispatcher?: EnvHttpProxyAgent;
};

export const supabaseFetch: typeof fetch = (input, init) => {
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  const local =
    proxy && ["127.0.0.1", "localhost"].includes(new URL(proxy).hostname);
  if (process.env.VERCEL || process.env.NODE_USE_ENV_PROXY !== "1" || !local)
    return fetch(input, init);
  shared.fitnessProxyDispatcher ??= new EnvHttpProxyAgent({
    // ponytail: one pooled local connection avoids concurrent slow handshakes;
    // Vercel uses its normal transport for multi-user throughput.
    connections: 1,
    allowH2: true,
    requestTls: { allowH2: true },
    pingInterval: 0,
    keepAliveTimeout: 60_000,
    keepAliveMaxTimeout: 60_000,
  });
  const options = { ...init, dispatcher: shared.fitnessProxyDispatcher };
  return fetch(input, options);
};
