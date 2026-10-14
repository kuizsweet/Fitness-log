export async function register() {
  if (
    process.env.NEXT_RUNTIME !== "nodejs" ||
    process.env.NEXT_PHASE === "phase-production-build"
  )
    return;
  const { configured } = await import("./lib/supabase/config");
  if (!configured()) return;
  const { preloadPublicKeys } = await import("./lib/supabase/claims");
  const start = Date.now();
  try {
    await preloadPublicKeys();
    console.info(`公开验证公钥预加载完成：${Date.now() - start} ms`);
  } catch {
    console.warn("公开验证公钥预加载未完成，登录验证继续使用官方 SDK。");
  }
}
