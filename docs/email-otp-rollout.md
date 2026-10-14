# 邮箱验证码注册

注册继续使用 Supabase Auth 的邮箱密码账号。`signUp` 创建待验证账号，邮件正文显示 `{{ .Token }}`，网页调用 `verifyOtp({ email, token, type: "email" })` 完成验证并建立官方 SSR 会话。验证码由 Supabase 生成、校验和限流；应用不存储或自签验证码，不关闭邮箱确认。

## 上线顺序

1. Supabase Authentication → Emails → Confirm sign up：将正文替换为 `supabase/templates/confirm-signup-otp.html`，主题设置为“kuizfit 邮箱验证码”，保存。过渡模板同时提供验证码和旧版兼容链接，不中断旧客户端。
2. 部署新版 AuthForm，确认线上有“输入已有验证码”入口和 8 位输入框。新版上线后可移除邮件的兼容链接段落。
3. Email provider 的 OTP 长度保留为 8（本次控制台已核对）；用户允许采用改动较少的原生长度。保留 Confirm email 和服务端验证限流。QQ SMTP 无须更换。
4. 用未注册的新邮箱从正式网站注册，确认收到 8 位验证码，填入后进入控制台，刷新仍保持登录。错误验证码、过期码和已使用码应被拒绝；重复发送受到 Supabase 服务端限流。

不要在新版网页上线前将线上模板改成只有验证码，旧网页没有输入入口。本地代码已接入；模板切换、生产部署与真实新账号完整验证必须分别确认，不能仅凭编译或收到邮件报告注册通过。

“忘记密码”仍使用现有链接流程，此次只替换注册和注册邮件重发。输入已有验证码入口用于新页面或已有待验证注册；验证码不出现在 URL，不写入日志。

参考：[Supabase 邮件模板](https://supabase.com/docs/guides/auth/auth-email-templates)、[verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp)。
