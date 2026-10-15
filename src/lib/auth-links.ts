/** Keep the callback on the browser's origin so PKCE can read its verifier cookie. */
export function authCallbackUrl(
  origin: string,
  siteUrl?: string,
  recovery = false,
) {
  const current = new URL(origin);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(current.hostname);
  const configured = !local && siteUrl ? new URL(siteUrl) : current;
  if (
    !local &&
    (current.protocol !== "https:" ||
      configured.protocol !== "https:" ||
      ["localhost", "127.0.0.1", "[::1]"].includes(configured.hostname))
  ) {
    throw new Error("网站认证地址配置错误，请联系管理员。");
  }
  const url = new URL("/auth/callback", current.origin);
  if (recovery) url.search = "?next=/auth%3Fmode%3Dupdate";
  return url.toString();
}

export const emailLinkError =
  "验证链接已失效或已使用，请重新发送验证邮件，并打开最新的一封。";

export function authLinkFailureUrl(origin: string, recovery = false) {
  const url = new URL("/auth", origin);
  if (recovery) url.searchParams.set("mode", "reset");
  url.searchParams.set(
    "error",
    recovery
      ? "重置链接无法验证，可能已过期、已使用，或未在发起找回的浏览器中打开。请重新发送重置邮件。"
      : emailLinkError,
  );
  return url;
}
