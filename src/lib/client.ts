export async function api<T>(
  path: string,
  data?: unknown,
  method = data === undefined ? "GET" : "POST",
): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method,
    headers:
      data instanceof FormData
        ? undefined
        : { "Content-Type": "application/json" },
    body:
      data === undefined
        ? undefined
        : data instanceof FormData
          ? data
          : JSON.stringify(data),
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "操作失败");
  return result as T;
}
