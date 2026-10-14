# kuizfit 正式认证与注册防护

## 本次发现与状态（2026-10-14）

- 控制台最初显示 Supabase Site URL 为 `http://localhost:3000`，Redirect URLs 为空。这会使未被白名单接受的邮件回调退回本地默认地址。
- 添加了下面 6 条准确回调路径；在用户重新登录后的页面中，Site URL 已显示 `https://kuizfit.cc.cd`。管理会话反复失效，未完成邮件模板、防护开关和 SMTP 配置核查；不能据此报告新邮件端到端通过。
- 数据库只读核查：5 个 auth.users，5 个邮箱已验证，0 个待验证；全部有对应 profiles。最新一条注册也已验证。未输出邮箱、账号 ID、密码或邮件令牌。
- `otp_expired` 与域名配置是不同问题。链接单次使用、过期、重复发送后打开旧邮件或邮件扫描器预取都可能导致失效；目前不能确定是哪一种。改地址不会修复已发送的旧链接。
- 注册账号由 Supabase Auth 建立，profiles 由现有数据库触发器创建，验证成功更新账号状态。保留 Confirm email 与 RLS，未手动创建/确认任何真实用户。
- 已加入验证码前端、邮件重发、错误片段提示、生产回调地址检查，以及 token_hash 的 GET 展示 / 同源 POST 验证。仍兼容已有 PKCE code 回调。
- PKCE callback 保持发起注册的浏览器域名，以读取该域的 verifier Cookie；不能把不同别名的 PKCE 回调强行合并到主域名。跨浏览器或固定主域名的确认使用 token_hash 模板。
- 已通过 Cloudflare 官方接口创建 `kuizfit Auth` Managed widget，域名限定 `kuizfit.cc.cd`、`kuizfit.vercel.app`、`localhost`。用户已把默认 Vercel 域名从 `kuizfitcdcc.vercel.app` 改为 `kuizfit.vercel.app`，widget 已同步；Supabase 新别名白名单仍待核对与替换。公开 site key 已写本地忽略的 `.env.local`；secret 未写仓库或浏览器代码。**创建 widget 与接好前端并不等于注册防护已经启用。**
- 用户新窗口中 SMTP 显示自定义发送已启用，主机 `smtp.qq.com`、端口 465、同用户邮件间隔 60 秒；未修改 SMTP 凭据，未发送测试邮件，未核实最终投递。
- 浏览器真实核对：过期 hash 被转为中文提示，重发入口不需要密码，登录验证码自动完成后提交按钮解锁，切换表单时重新验证；未提交用户邮箱或触发注册。
- 本地 HTTP 回调检查通过：GET 不消耗 token_hash、HTML 属性转义、外部 next 不能跳转、跨域 POST 为 403、缺失/过期链接为 303 返回认证页。单独修正 Referrer-Policy 及 Next dev 的 0.0.0.0 绑定地址问题。
- Vercel Production 的 `NEXT_PUBLIC_SITE_URL=https://kuizfit.cc.cd` 已在用户授权后从不可更改类型的 Secret 重建为 Config；新增公开 `NEXT_PUBLIC_TURNSTILE_SITE_KEY` Config，两项均保存成功。原 Supabase 连接变量保持原样。修改需要下一次部署才能进入运行网站，尚未提交代码或触发部署。

## 正式地址

Supabase Authentication → URL Configuration：

Site URL：`https://kuizfit.cc.cd`

Redirect URLs：

```text
https://kuizfit.cc.cd/auth/callback
https://kuizfit.cc.cd/auth/callback?next=/auth%3Fmode%3Dupdate
https://kuizfit.vercel.app/auth/callback
https://kuizfit.vercel.app/auth/callback?next=/auth%3Fmode%3Dupdate
http://localhost:3000/auth/callback
http://localhost:3000/auth/callback?next=/auth%3Fmode%3Dupdate
```

Vercel Production 环境变量：

```dotenv
NEXT_PUBLIC_SITE_URL=https://kuizfit.cc.cd
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAFWkxMD0tE0bZs7s
```

生产变量应在新版构建前设置，旧部署不会因修改变量自动更新。保留已有 Supabase URL / Publishable Key；不要上传 localhost 代理变量。

## 采用的现成方案与依据

| 来源 | 信息 | 对本项目的处理 |
| --- | --- | --- |
| [Supabase 官方 CAPTCHA 文档](https://supabase.com/docs/guides/auth/auth-captcha) | Auth 原生支持 Turnstile、hCaptcha，并接收 captchaToken | 直接使用原生验证，不另建注册后端或暴露 service_role |
| [marsidev/react-turnstile](https://github.com/marsidev/react-turnstile) | Supabase 官方示例使用的 React 组件；MIT；安装 1.6.2，支持 React 19 | 注册、登录、重置、重发均传令牌；到期/错误清空，每次请求后 reset；验证码无法加载时不放行 |
| [Supabase GitHub 讨论](https://github.com/orgs/supabase/discussions/43520) | 社区建议 starter 接入 Turnstile，并报告减少垃圾注册 | 可作为实践参考，不当作防住所有攻击的证明 |
| [Reddit：直接调用公开 Auth 接口](https://www.reddit.com/r/Supabase/comments/1sm75sv/supabase_auth_allows_direct_signup_via_anon_key/) | 只在网页校验可以被 direct signup 绕过 | 最终必须打开 Supabase 服务端 CAPTCHA；仅部署前端不构成防护 |
| [Reddit：Tips for fighting spam](https://www.reddit.com/r/Supabase/comments/1d06zxr/) | 社区仍遇到通过邮箱验证/验证码的垃圾账号 | 验证码、邮箱确认和限流分层使用，不承诺零垃圾账号 |
| [GitHub：邮件链接预取](https://github.com/orgs/supabase/discussions/28193) 与 [官方邮件模板说明](https://supabase.com/docs/guides/auth/auth-email-templates) | 安全扫描器可能提前消耗单次链接 | token_hash 链接使用明确确认步骤；需在新版上线后更改模板 |

[官方 Rate Limits](https://supabase.com/docs/guides/auth/rate-limits) 支持 Auth 的 IP 和邮件限流。保留原有限流，下一步读取项目实际设置再决定是否收紧。邮件发送上限不等于完整防注册能力；共享出口的正常用户也会受到 IP 限流影响。若使用默认邮件服务，发送额度、收件人限制和模板权限需要核实，公开注册通常应配置自己的 SMTP。

Cloudflare Turnstile 可独立嵌入 Vercel 网站，**不要求迁移 DNS 或改为 Cloudflare 托管**。不要仅在网站域名上加 WAF 就认为直接 Supabase Auth 请求已受保护。

首版不加入临时邮箱黑名单、IP 永久封禁、内存计数限流或人工审批。先观察真实滥用数据；如有持续攻击，可用 [Before User Created Hook](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook) 在创建账号之前实施规则，但要评估误伤与新增维护成本。

## 启用顺序与待验收

1. 确认 Supabase Site URL / 白名单已持久保存；在 Emails 查看 Confirm signup 与 Reset password 是否引用了正确的 Site URL 或 RedirectTo，无硬编码 localhost。
2. 在 Vercel Production 设置上面两个公开变量。把新版代码上传 GitHub，等待实际部署 Ready，并打开正式 `/auth`，核实验证码组件能加载。此步骤完成前，不打开 Supabase CAPTCHA。
3. Cloudflare → Turnstile → `kuizfit Auth` 获取 secret；**只填在 Supabase Authentication → Attack Protection → Enable CAPTCHA → Turnstile**。不要填进 NEXT_PUBLIC 变量、仓库、聊天或浏览器代码。开启后，旧部署、预览域名、未配置 widget 的本地客户端以及原先无 CAPTCHA 的真实登录测试会被拒绝；不要为了让测试通过关闭防护。
4. 在正式站完成真实注册/邮箱点击/登录/刷新/重置验收；用最新邮件，旧链接不会复活。现有已确认账号可以直接登录，无需重复创建。
5. 验证直接请求 Auth 的缺失令牌、无效令牌、过期令牌和重放令牌均被拒绝，真实令牌只成功一次。只能在服务端开关配置完成后称为已启用；目前这些真实防护验收仍待完成。
6. 如需防邮件扫描预取，在新版 POST 回调上线后使用上面 token_hash 模板。跨浏览器确认也需此模板；默认 PKCE 需要同一浏览器保存的 verifier。

本地静态检查、30 项测试和生产构建通过；这些检查不替代真实邮件与服务端 CAPTCHA 验收。

参考：[Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)、[Turnstile 官方接入](https://developers.cloudflare.com/turnstile/get-started/)、[官方 token 验证](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)。
