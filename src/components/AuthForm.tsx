"use client";
import { useRef, useState } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { authCallbackUrl } from "@/lib/auth-links";
import { useSearchParams } from "next/navigation";
import { browserClient } from "@/lib/supabase/browser";
import { Feedback } from "./Feedback";
export function AuthForm({ configured }: { configured: boolean }) {
  const params = useSearchParams();
  const [mode, setMode] = useState(
    params.get("mode") === "update"
      ? "update"
      : params.get("mode") === "reset"
        ? "reset"
        : "login",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState(params.get("error") ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const captcha = useRef<TurnstileInstance>(null);
  const [captchaToken, setCaptchaToken] = useState<string>();
  const [captchaError, setCaptchaError] = useState("");
  const needsCaptcha = Boolean(siteKey) && !["update", "verify"].includes(mode);
  const title = {
    login: "登录",
    signup: "注册",
    reset: "发送重置邮件",
    update: "设置新密码",
    resend: "重新发送验证码",
    verify: "验证邮箱",
  }[mode];
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (needsCaptcha && (!captchaToken || captcha.current?.isExpired()))
        throw new Error("请先完成安全验证。");
      const auth = browserClient().auth;
      if (mode === "login") {
        const r = await auth.signInWithPassword({
          email,
          password,
          options: { captchaToken },
        });
        if (r.error) throw r.error;
        window.location.assign("/dashboard");
      }
      if (mode === "signup") {
        const r = await auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: authCallbackUrl(
              window.location.origin,
              process.env.NEXT_PUBLIC_SITE_URL,
            ),
            captchaToken,
          },
        });
        if (r.error) throw r.error;
        if (r.data.session) window.location.assign("/dashboard");
        else {
          setPassword("");
          setOtp("");
          setMode("verify");
          setMessage(
            "请查看最新邮件，将其中的 8 位验证码填在下方。已有账号请直接登录。",
          );
        }
      }
      if (mode === "reset") {
        const r = await auth.resetPasswordForEmail(email, {
          redirectTo: authCallbackUrl(
            window.location.origin,
            process.env.NEXT_PUBLIC_SITE_URL,
            true,
          ),
          captchaToken,
        });
        if (r.error) throw r.error;
        setMessage("重置邮件请求已提交。若账号存在，请查看邮箱。");
      }
      if (mode === "resend") {
        const r = await auth.resend({
          type: "signup",
          email,
          options: {
            emailRedirectTo: authCallbackUrl(
              window.location.origin,
              process.env.NEXT_PUBLIC_SITE_URL,
            ),
            captchaToken,
          },
        });
        if (r.error) throw r.error;
        setOtp("");
        setMode("verify");
        setMessage("验证码邮件请求已提交，请使用最新邮件中的 8 位验证码。");
      }
      if (mode === "verify") {
        if (!/^[0-9]{8}$/.test(otp))
          throw new Error("请输入完整的 8 位数字验证码。");
        const r = await auth.verifyOtp({
          email: email.trim(),
          token: otp,
          type: "email",
        });
        if (r.error) {
          if (r.error.code === "otp_expired")
            throw new Error(
              "验证码错误、已使用或已过期，请检查最新邮件，或重新发送。",
            );
          throw r.error;
        }
        if (!r.data.session) throw new Error("未能建立登录会话，请重试。");
        window.location.assign("/dashboard");
      }
      if (mode === "update") {
        const u = await auth.getUser();
        if (!u.data.user) throw new Error("重置链接已过期，请重新发送重置邮件");
        const r = await auth.updateUser({ password });
        if (r.error) throw r.error;
        setMessage("密码已更新，可以进入控制台。");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "账号操作失败");
    } finally {
      setCaptchaToken(undefined);
      captcha.current?.reset();
      setBusy(false);
    }
  }
  if (!configured)
    return (
      <>
        <p className="error">Supabase 尚未配置，账号功能暂不可用。</p>
        <a href="/">返回配置提示</a>
      </>
    );
  return (
    <>
      <h2>{title}</h2>
      <form className="stack" onSubmit={submit}>
        {mode !== "update" && (
          <label>
            邮箱
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setOtp("");
              }}
            />
          </label>
        )}
        {["login", "signup", "update"].includes(mode) && (
          <label>
            密码（至少 8 位）
            <input
              required
              minLength={8}
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        {mode === "verify" && (
          <label>
            邮箱验证码（8 位）
            <input
              required
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{8}"
              maxLength={8}
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))
              }
            />
          </label>
        )}
        {needsCaptcha && siteKey && (
          <div className="stack">
            <Turnstile
              key={mode}
              ref={captcha}
              siteKey={siteKey}
              options={{ theme: "light", size: "flexible", language: "zh-cn" }}
              onSuccess={(token) => {
                setCaptchaToken(token);
                setCaptchaError("");
              }}
              onExpire={() => setCaptchaToken(undefined)}
              onTimeout={() => setCaptchaToken(undefined)}
              onError={() => {
                setCaptchaToken(undefined);
                setCaptchaError("安全验证加载失败，请检查网络后重试。");
              }}
              scriptOptions={{
                onError: () => {
                  setCaptchaToken(undefined);
                  setCaptchaError("安全验证无法加载，请检查网络后刷新页面。");
                },
              }}
            />
            {captchaError && (
              <p role="alert" className="error">
                {captchaError}
              </p>
            )}
          </div>
        )}
        <button
          className="primary"
          disabled={busy || (needsCaptcha && !captchaToken)}
        >
          {title}
        </button>
      </form>
      <Feedback error={error} message={message} loading={busy} />
      <div className="row">
        {["login", "signup", "reset", "resend", "verify"]
          .filter((m) => m !== mode)
          .map((m) => (
            <button
              key={m}
              disabled={busy}
              onClick={() => {
                setMode(m);
                setError("");
                setMessage("");
                setCaptchaToken(undefined);
                setCaptchaError("");
                setOtp("");
              }}
            >
              {m === "login"
                ? "已有账号"
                : m === "signup"
                  ? "创建账号"
                  : m === "reset"
                    ? "忘记密码"
                    : m === "resend"
                      ? "重新发送验证码"
                      : "输入已有验证码"}
            </button>
          ))}
        {mode === "update" && <a href="/dashboard">进入控制台</a>}
      </div>
    </>
  );
}
