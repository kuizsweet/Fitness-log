export function callbackRequestOrigin(request: Request, canonical?: string) {
  const url = new URL(request.url);
  if (url.hostname !== "0.0.0.0") return url.origin;
  const host = request.headers.get("host");
  if (host) {
    const incoming = new URL(`${url.protocol}//${host}`);
    if (
      ["localhost", "127.0.0.1", "[::1]"].includes(incoming.hostname) &&
      incoming.port === url.port
    )
      return incoming.origin;
  }
  if (canonical) return new URL(canonical).origin;
  throw new Error("无法确定认证回调地址");
}

export function trustedRequestOrigin(
  request: Request,
  canonical: string | undefined,
  development: boolean,
) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const destination = new URL(request.url);
  if (origin === destination.origin || origin === canonical) return true;
  // Both next dev and a local next start reconstruct the URL as 0.0.0.0.
  // Runtime mode must not reject the same exact loopback origin and Host.
  void development;
  try {
    const source = new URL(origin);
    // Next bound to 0.0.0.0 reconstructs Request.url with that hostname.
    // Accept only the exact incoming loopback host and the same protocol/port.
    return (
      destination.hostname === "0.0.0.0" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(source.hostname) &&
      source.protocol === destination.protocol &&
      source.port === destination.port &&
      source.host === request.headers.get("host")
    );
  } catch {
    return false;
  }
}
