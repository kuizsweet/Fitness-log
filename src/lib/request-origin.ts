export function trustedRequestOrigin(
  request: Request,
  canonical: string | undefined,
  development: boolean,
) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const destination = new URL(request.url);
  if (origin === destination.origin || origin === canonical) return true;
  if (!development) return false;
  try {
    const source = new URL(origin);
    // Next dev bound to 0.0.0.0 reconstructs Request.url with that hostname.
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
