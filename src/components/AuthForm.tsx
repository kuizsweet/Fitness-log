"use client";
import { useState } from "react";
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
  const [error, setError] = useState(params.get("error") ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const title = {
    login: "登录",
    signup: "注册",
    reset: "发送重置邮件",
    update: "设置新密码",
  }[mode];
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const auth = browserClient().auth;
      const origin = window.location.origin;
      if (mode === "login") {
        const r = await auth.signInWithPassword({ email, password });
        if (r.error) throw r.error;
        window.location.assign("/journal");
      }
      if (mode === "signup") {
        const r = await auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${origin}/auth/callback` },
        });
        if (r.error) throw r.error;
        if (r.data.session) window.location.assign("/journal");
        else
          setMessage(
            "注册请求已提交，请查看邮箱并完成认证。如果未收到邮件，请检查邮件配置或稍后重试。",
          );
      }
      if (mode === "reset") {
        const r = await auth.resetPasswordForEmail(email, {
          redirectTo: `${origin}/auth/callback?next=/auth%3Fmode%3Dupdate`,
        });
        if (r.error) throw r.error;
        setMessage("重置邮件请求已提交。若账号存在，请查看邮箱。");
      }
      if (mode === "update") {
        const u = await auth.getUser();
        if (!u.data.user) throw new Error("重置链接已过期，请重新发送重置邮件");
        const r = await auth.updateUser({ password });
        if (r.error) throw r.error;
        setMessage("密码已更新，可以进入日志。");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "账号操作失败");
    } finally {
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
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
        )}
        {mode !== "reset" && (
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
        <button className="primary" disabled={busy}>
          {title}
        </button>
      </form>
      <Feedback error={error} message={message} loading={busy} />
      <div className="row">
        {["login", "signup", "reset"]
          .filter((m) => m !== mode)
          .map((m) => (
            <button
              key={m}
              disabled={busy}
              onClick={() => {
                setMode(m);
                setError("");
                setMessage("");
              }}
            >
              {m === "login"
                ? "已有账号"
                : m === "signup"
                  ? "创建账号"
                  : "忘记密码"}
            </button>
          ))}
        {mode === "update" && <a href="/journal">进入日志</a>}
      </div>
    </>
  );
}
