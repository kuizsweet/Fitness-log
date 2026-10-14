# kuizfit 本地接入与真实验收

Project URL 对应 `NEXT_PUBLIC_SUPABASE_URL`；Publishable Key 对应 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`。本地网站地址为 `NEXT_PUBLIC_SITE_URL=http://localhost:3000`。配置写在项目根目录 `.env.local`，Git 已忽略；不要将 Secret Key / service_role 放到公开变量。

## 数据库迁移

项目没有重建，原迁移保留。新增 `202610130003_explicit_privileges.sql`，显式移除本应用表的默认多余权限（包括不受 RLS 逐行保护的 TRUNCATE），只授予认证用户必要 CRUD，预览表仅 SELECT/INSERT/DELETE。未改其他应用的表或默认权限。

在 Supabase **Connect → Session pooler** 复制 5432 端口的 PostgreSQL URI，密码含特殊字符时进行 URL 编码，仅本地填写：

```dotenv
SUPABASE_DB_URL=postgresql://...（从控制台复制并在本地填密码）
SUPABASE_DB_CA_FILE=supabase-ca.crt
```

证书从 **Database → Settings → SSL Configuration → Download certificate** 下载，保存为项目根目录 `supabase-ca.crt`（已忽略）。迁移工具验证 TLS 证书和项目标识，不关闭 SSL 校验。

```powershell
npm.cmd run supabase:inspect   # 只读检查已有表、RLS、权限与 bucket
npm.cmd run supabase:migrate   # 事务执行缺失迁移
```

`fitness_journal_meta.migrations` 保存迁移版本与校验和，不向客户端暴露。已登记迁移重复执行会跳过；若存在业务表但无迁移记录，工具停止并保留原表，先用 `supabase/inspect.sql` 核查，不能直接补做 CREATE TABLE 或重置数据库。

执行后应看到 10 张业务表全部启用 RLS，以及 `meal-photos` 的 `public=false`。路径规则绑定 `user_id/meal_id/photo_id.jpg`，私有照片通过短期签名 URL 访问。`auth.users` 使用 Supabase 自带账号表，profile 由注册触发器建立。

如果采用控制台：SQL Editor → New query，粘贴 `supabase/setup.sql` 的完整内容后 Run；该文件由 `npm.cmd run supabase:prepare` 生成，具有同样的事务/重复检测/已有表保护。之后运行 `supabase/inspect.sql` 只读审查。不要分别重复执行未登记的初始建表 SQL。

## 本地邮箱注册与登录

1. **Authentication → Sign In / Providers（或 Email provider）**：启用 Email/password、Allow new users to sign up，开启 Confirm email。不要开启匿名登录来替代账号。
2. **Authentication → URL Configuration**：Site URL 设为 `http://localhost:3000`；Additional Redirect URLs 添加 `http://localhost:3000/**`，本地通配符覆盖确认与重置回调，生产部署时换为准确 HTTPS 回调路径。
3. **Authentication → Email Templates**：保留默认 ConfirmationURL 可用于同浏览器 PKCE。若需跨浏览器点击确认邮件，Confirm signup 链接使用 `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup`；Reset password 使用 `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery`。现有回调同时支持 code/token_hash。
4. **Authentication → SMTP Settings**：默认邮件服务可能仅允许组织已授权邮箱且限额较低；面向一般邮箱的真实注册应配置自己的 SMTP。不要用关闭邮箱验证冒充邮件流程成功。
5. 打开 `/auth` 注册、确认邮件并登录。现有 `@supabase/ssr` 浏览器/服务端客户端共享 cookie，会话通过 proxy 刷新；服务端使用 getUser 验证，不依赖客户端自报登录状态。
6. 刷新浏览器、新开同浏览器标签页应维持登录；退出后私有页面应进入登录页。多设备使用同一账号的数据库数据。

## 真实验证

```powershell
npm.cmd run supabase:check
npm.cmd run test:smoke
npm.cmd run test:db
```

最后一项需要两个已确认的不同测试账号。**Authentication → Users → Add user → Create new user** 建立专门的测试用户，勾选确认邮箱（只用于集成测试；不代替真实注册邮件验收）。只在 `.env.local` 填写 `TEST_USER_A_EMAIL/PASSWORD`、`TEST_USER_B_EMAIL/PASSWORD`，不用发到聊天。

`npm.cmd run test:session` 使用真实登录建立官方 SSR Cookie，验证本地应用跨请求保持同一账号、刷新会话及退出后拒绝访问。它不会伪造 Cookie 或修改已有业务数据。

## Windows 本地代理

本次检测到现有 Mihomo HTTP 代理 `127.0.0.1:7890`。DNS 正常，但 Supabase 项目域名直连 TLS 被重置，Node 没有自动继承 Windows 代理。本地 `.env.local` 设置了：

```dotenv
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890
NO_PROXY=localhost,127.0.0.1,::1
NODE_USE_ENV_PROXY=1
```

`scripts/with-env.mjs` 先加载本地环境，再启动 Node 子进程，使 Node 初始化网络代理时即可读到配置；dev/start/连接检查/真实测试均使用这个入口。Next.js 开发子进程会转发启动选项，因此没有将 `--env-file` 塞入 NODE_OPTIONS。使用本机现有 Node 24.14.1（代理支持建议 Node 24.5+）。

未修改 Windows 全局代理、DNS、代理软件规则或 TLS 验证；本地请求绕过代理。关闭代理后，这台电脑访问 Supabase API 可能再次失败。**Vercel 不应设置指向 127.0.0.1 的代理环境变量**，只配置生产服务参数。

本机构建中，携带代理的 Turbopack CSS 子进程报连接错误；隔离构建代理后编译、类型检查和页面生成均通过。因此 build 使用 `--without-proxy`，仅清空此次构建子进程的代理环境；dev/start 与真实服务测试继续使用本地代理。当前构建无需获取云端用户数据或远程字体。

脚本将明确标记的临时记录和测试 JPEG 写入真实 Supabase，核对读回、跨账号拒绝与 Storage，再清理自身创建的 ID。不会修改或删除已有训练/照片。没有真实服务成功返回时不会报告通过。

`supabase:check` 区分 Auth HTTP 状态、邮箱开关、迁移缺失和匿名权限拒绝。`ECONNRESET` 表示请求尚未取得服务响应，不能据此断言 Key 有效或 RLS 已部署。`SELF_SIGNED_CERT_IN_CHAIN` 需要控制台下载的数据库 CA，不能通过关闭 TLS 验证解决。

参考：[API Key](https://supabase.com/docs/guides/getting-started/api-keys)、[Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)、[数据库连接](https://supabase.com/docs/guides/database/connecting-to-postgres)、[证书验证](https://supabase.com/docs/guides/platform/ssl-enforcement)、[私有 Storage](https://supabase.com/docs/guides/storage/buckets/fundamentals)。
