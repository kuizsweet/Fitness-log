import { resourceOwner } from "./resource-keys";
export class ApiResponseError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  data?: unknown,
  method = data === undefined ? "GET" : "POST",
  options: { signal?: AbortSignal; notify?: boolean } = {},
): Promise<T> {
  const owner = resourceOwner();
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
    signal: options.signal,
  });
  const result = await response.json();
  if (!response.ok)
    throw new ApiResponseError(result.error ?? "操作失败", response.status);
  if (options.notify !== false && method !== "GET" && method !== "HEAD")
    window.dispatchEvent(
      new CustomEvent("fitness-data-change", {
        detail: {
          owner,
          resource: path.split(/[/?]/)[0],
          method,
          data,
          result,
        },
      }),
    );
  return result as T;
}
