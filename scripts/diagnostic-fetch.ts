export const diagnosticFetch: typeof fetch = async (input, options) => {
  const url = new URL(
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
  );
  const method =
    options?.method ?? (input instanceof Request ? input.method : "GET");
  const segments = url.pathname.split("/").filter(Boolean);
  const label = segments
    .slice(
      0,
      url.hostname === "localhost" || url.hostname === "127.0.0.1" ? 2 : 3,
    )
    .join("/");
  const attempts =
    ["GET", "HEAD", "DELETE"].includes(method.toUpperCase()) &&
    !(input instanceof Request)
      ? 3
      : 1;
  // Mutations are never retried: a lost response may follow a committed write.
  const headers = new Headers(options?.headers);
  headers.set("Connection", "close");
  for (let attempt = 1; attempt <= attempts; attempt++)
    try {
      const signals = [
        AbortSignal.timeout(20000),
        ...(options?.signal ? [options.signal] : []),
      ];
      const response = await fetch(input, {
        ...options,
        headers,
        signal: AbortSignal.any(signals),
      });
      console.log(`服务请求 ${method} ${label} → ${response.status}`);
      return response;
    } catch (error) {
      const e = error as Error & { cause?: { code?: string } };
      if (attempt < attempts && !options?.signal?.aborted) {
        console.log(
          `服务请求 ${method} ${label} 网络中断，重试 ${attempt}/${attempts - 1}`,
        );
        continue;
      }
      throw new Error(
        `服务请求 ${method} ${label} 失败：${e.cause?.code ?? e.name}`,
      );
    }
  throw new Error("请求未完成");
};
