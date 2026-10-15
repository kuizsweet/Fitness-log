"use client";
import { useRef, useState } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { authCallbackUrl } from "@/lib/auth-links";
import { passwordResetError } from "@/lib/password-reset";
import { useRouter, useSearchParams } from "next/navigation";
import { browserClient } from "@/lib/supabase/browser";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  Input,
} from "./auth/controls";
import styles from "./auth/AuthForm.module.css";
import "@fontsource-variable/noto-sans-sc";
const authModes = [
  "login",
  "signup",
  "reset",
  "update",
  "resend",
  "verify",
] as const;
type AuthMode = (typeof authModes)[number];
export function AuthForm({ configured }: { configured: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const requested = params.get("mode");
  const mode: AuthMode = authModes.includes(requested as AuthMode)
    ? (requested as AuthMode)
    : "login";
  function setMode(next: AuthMode) {
    router.replace(next === "login" ? "/auth" : `/auth?mode=${next}`, {
      scroll: false,
    });
  }
  function switchMode(next: AuthMode) {
    setMode(next);
    setError("");
    setMessage("");
    setCaptchaToken(undefined);
    setCaptchaError("");
    setCaptchaRenderedMode(null);
    setOtp("");
    setPassword("");
    setConfirmPassword("");
    setPasswordUpdated(false);
    setRegistrationEmail(undefined);
  }
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState(params.get("error") ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [registrationEmail, setRegistrationEmail] = useState<string>();
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const captcha = useRef<TurnstileInstance>(null);
  const [captchaToken, setCaptchaToken] = useState<string>();
  const [captchaError, setCaptchaError] = useState("");
  const [captchaRenderedMode, setCaptchaRenderedMode] =
    useState<AuthMode | null>(null);
  // Legacy verification URLs use the same registration card, never another screen.
  const isSignup = ["signup", "verify", "resend"].includes(mode);
  const isRecovery = mode === "reset" || mode === "update";
  const passwordIsSet =
    isSignup && (mode !== "signup" || registrationEmail === email.trim());
  const needsCaptcha = Boolean(siteKey) && mode !== "update";
  const title = {
    login: "登录",
    signup: "注册并登录",
    reset: "发送重置邮件",
    update: "保存新密码",
    resend: "注册并登录",
    verify: "注册并登录",
  }[mode];
  const descriptions = {
    login: "",
    signup: "使用邮箱创建你的 kuizfit 账号。",
    reset: "输入账号邮箱，接收密码重置邮件。",
    update: "输入并确认新密码，完成 kuizfit 账号的密码重置。",
    resend: "使用邮箱创建你的 kuizfit 账号。",
    verify: "使用邮箱创建你的 kuizfit 账号。",
  };
  async function sendRegistrationCode() {
    if (busy || !emailInput.current?.reportValidity()) return;
    if (!passwordIsSet && password.length < 8) {
      setError("请先设置至少 8 位密码，再发送验证码。");
      passwordInput.current?.focus();
      return;
    }
    setBusy(true);
    setSendingCode(true);
    setError("");
    setMessage("");
    try {
      if (needsCaptcha && (!captchaToken || captcha.current?.isExpired()))
        throw new Error("请先完成安全验证。");
      const auth = browserClient().auth;
      if (passwordIsSet) {
        const r = await auth.resend({
          type: "signup",
          email,
          options: {
            emailRedirectTo: authCallbackUrl(window.location.origin),
            captchaToken,
          },
        });
        if (r.error) throw r.error;
      } else {
        const r = await auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: authCallbackUrl(window.location.origin),
            captchaToken,
          },
        });
        if (r.error) throw r.error;
        if (r.data.session) {
          window.location.assign("/dashboard");
          return;
        }
      }
      setRegistrationEmail(email.trim());
      setPassword("");
      setShowPassword(false);
      setOtp("");
      setMessage("验证码邮件请求已提交，请查看最新邮件并输入 8 位验证码。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "验证码发送失败");
    } finally {
      setCaptchaToken(undefined);
      captcha.current?.reset();
      setSendingCode(false);
      setBusy(false);
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (
        needsCaptcha &&
        !isSignup &&
        (!captchaToken || captcha.current?.isExpired())
      )
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
      if (isSignup) {
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
        const validationError = passwordResetError(password, confirmPassword);
        if (validationError) throw new Error(validationError);
        const u = await auth.getUser();
        if (!u.data.user) throw new Error("重置链接已过期，请重新发送重置邮件");
        const r = await auth.updateUser({ password });
        if (r.error) throw r.error;
        setPassword("");
        setConfirmPassword("");
        setPasswordUpdated(true);
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
      <main className={styles.page}>
        <Card>
          <CardHeader>
            <CardTitle>账号暂不可用</CardTitle>
            <CardDescription>
              Supabase 尚未配置，账号功能暂不可用。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/">返回配置提示</a>
          </CardContent>
        </Card>
      </main>
    );
  return (
    <main className={styles.page}>
      {(isSignup || isRecovery) && <p className={styles.brand}>kuizfit</p>}
      <Card
        aria-labelledby="auth-title"
        data-template={isSignup || isRecovery ? "signup-03" : "login-01"}
      >
        <CardHeader
          className={
            isSignup || isRecovery
              ? styles.signupHeader
              : mode === "login"
                ? styles.loginHeader
                : undefined
          }
        >
          <CardTitle id="auth-title">
            {mode === "update"
              ? passwordUpdated
                ? "密码已重置"
                : "设置新密码"
              : isSignup
                ? "创建你的账号"
                : mode === "login"
                  ? "欢迎使用 kuizFit"
                  : title}
          </CardTitle>
          {!(mode === "login" && !descriptions.login) && (
            <CardDescription>
              {mode === "update" && passwordUpdated
                ? "新密码已保存，你可以继续使用 kuizfit。"
                : descriptions[mode]}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {mode === "update" && passwordUpdated ? (
            <Button onClick={() => window.location.assign("/dashboard")}>
              进入控制台
            </Button>
          ) : (
            <form
              onSubmit={submit}
              aria-busy={busy}
              aria-describedby={error ? "auth-error" : undefined}
            >
              <FieldGroup
                disabled={busy}
                aria-label={title}
                className={mode === "login" ? styles.loginFields : undefined}
              >
                {mode !== "update" && (
                  <Field>
                    <FieldLabel htmlFor="auth-email">邮箱</FieldLabel>
                    <Input
                      id="auth-email"
                      ref={emailInput}
                      required
                      type="email"
                      autoComplete="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setOtp("");
                        if (
                          registrationEmail &&
                          e.target.value.trim() !== registrationEmail
                        ) {
                          setRegistrationEmail(undefined);
                          setPassword("");
                          setMessage("");
                          setMode("signup");
                        }
                      }}
                    />
                  </Field>
                )}
                {(mode === "login" || mode === "update" || isSignup) && (
                  <Field>
                    <div className={styles.labelRow}>
                      <FieldLabel htmlFor="auth-password">
                        {mode === "update" ? "新密码" : "密码"}
                      </FieldLabel>
                    </div>
                    <div className={styles.passwordInputWrap}>
                      <Input
                        id="auth-password"
                        className={
                          mode === "login" ? styles.passwordInput : undefined
                        }
                        ref={passwordInput}
                        required={!isSignup}
                        readOnly={passwordIsSet}
                        placeholder={
                          passwordIsSet ? "密码已设置，无需重复输入" : undefined
                        }
                        minLength={8}
                        type={
                          showPassword && mode === "login" ? "text" : "password"
                        }
                        autoComplete={
                          mode === "login" ? "current-password" : "new-password"
                        }
                        value={password}
                        aria-describedby={
                          mode === "login" ? undefined : "password-hint"
                        }
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      {mode === "login" && (
                        <button
                          type="button"
                          className={styles.passwordVisibility}
                          aria-label={showPassword ? "隐藏密码" : "显示密码"}
                          aria-pressed={showPassword}
                          onClick={() => setShowPassword((visible) => !visible)}
                        >
                          {showPassword ? (
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
                              <path d="M9.9 5.2A10.8 10.8 0 0112 5c5.5 0 9 7 9 7a16 16 0 01-3.1 3.8M6.2 6.2C3.8 7.8 2 12 2 12s3.5 7 10 7c1 0 1.9-.2 2.7-.5" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                    {mode !== "login" && (
                      <FieldDescription id="password-hint">
                        {passwordIsSet
                          ? "完成邮箱验证后即可登录。"
                          : "密码至少需要 8 位。"}
                      </FieldDescription>
                    )}
                  </Field>
                )}
                {mode === "update" && (
                  <Field>
                    <FieldLabel htmlFor="auth-confirm-password">
                      确认新密码
                    </FieldLabel>
                    <Input
                      id="auth-confirm-password"
                      required
                      minLength={8}
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </Field>
                )}
                {isSignup && (
                  <Field>
                    <FieldLabel htmlFor="auth-otp">
                      邮箱验证码（8 位）
                    </FieldLabel>
                    <div className={styles.codeRow}>
                      <Input
                        id="auth-otp"
                        className={styles.otp}
                        required
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]{8}"
                        aria-describedby="code-hint"
                        maxLength={8}
                        value={otp}
                        onChange={(e) =>
                          setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))
                        }
                      />
                      <Button
                        type="button"
                        className={styles.sendCode}
                        disabled={busy || (needsCaptcha && !captchaToken)}
                        onClick={sendRegistrationCode}
                      >
                        {sendingCode
                          ? "发送中…"
                          : passwordIsSet
                            ? "重新发送"
                            : "发送验证码"}
                      </Button>
                    </div>
                    <FieldDescription
                      id="code-hint"
                      role={message ? "status" : undefined}
                    >
                      {message || "先完成下方安全验证，再发送验证码。"}
                    </FieldDescription>
                  </Field>
                )}
                {needsCaptcha && siteKey && (
                  <div className={styles.captcha}>
                    <div className={styles.captchaWidget}>
                      {captchaRenderedMode !== mode && !captchaError && (
                        <span className={styles.captchaLoading} role="status">
                          正在加载安全验证…
                        </span>
                      )}
                      <Turnstile
                        key={mode}
                        ref={captcha}
                        siteKey={siteKey}
                        options={{
                          theme: "light",
                          size: "flexible",
                          language: "zh-cn",
                        }}
                        onWidgetLoad={() => setCaptchaRenderedMode(mode)}
                        onSuccess={(token) => {
                          setCaptchaToken(token);
                          setCaptchaError("");
                        }}
                        onExpire={() => setCaptchaToken(undefined)}
                        onTimeout={() => setCaptchaToken(undefined)}
                        onError={() => {
                          setCaptchaToken(undefined);
                          setCaptchaError(
                            "安全验证加载失败，请检查网络后重试。",
                          );
                        }}
                        scriptOptions={{
                          onError: () => {
                            setCaptchaToken(undefined);
                            setCaptchaError(
                              "安全验证无法加载，请检查网络后刷新页面。",
                            );
                          },
                        }}
                      />
                    </div>
                    {captchaError && (
                      <p role="alert" className={styles.error}>
                        {captchaError}
                      </p>
                    )}
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={
                    busy ||
                    (isSignup
                      ? otp.length !== 8
                      : needsCaptcha && !captchaToken)
                  }
                >
                  {busy && !sendingCode ? "处理中…" : title}
                </Button>
              </FieldGroup>
            </form>
          )}
          {error && (
            <p id="auth-error" role="alert" className={styles.error}>
              {error}
            </p>
          )}
          {!isSignup && !busy && message && (
            <p role="status" className={styles.status}>
              {message}
            </p>
          )}
          {mode !== "login" && (
            <div className={styles.footer}>
              <FieldDescription>
                <>
                  {!isRecovery && <>已有账号？ </>}
                  <button
                    type="button"
                    className={styles.textButton}
                    disabled={busy}
                    onClick={() => switchMode("login")}
                  >
                    返回登录
                  </button>
                </>
              </FieldDescription>
            </div>
          )}
          {mode === "login" && (
            <div className={styles.loginActions}>
              <button
                type="button"
                className={styles.textButton}
                disabled={busy}
                onClick={() => switchMode("signup")}
              >
                注册
              </button>
              <button
                type="button"
                className={`${styles.textButton} ${styles.forgotPassword}`}
                onClick={() => switchMode("reset")}
              >
                忘记密码？
              </button>
            </div>
          )}
          {mode === "update" && !passwordUpdated && (
            <p className={styles.footer}>
              <button
                type="button"
                className={styles.textButton}
                disabled={busy}
                onClick={() => switchMode("reset")}
              >
                链接失效？重新发送邮件
              </button>
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
