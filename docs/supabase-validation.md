# Supabase 真实接入验证

日期：2026-10-14（Asia/Shanghai）。项目 kuizfit，Project URL 标识 `rgrekxlrkgnqdvhujeks`。在原工作区接入，没有重新创建应用或重置数据库。无完整密钥、连接密码或账号密码写入本报告。

## 已确认的配置与迁移

- `.env.local` 的 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 已按现有初始化代码填写，其他参数保留。
- 数据库管理连接使用 Session pooler 和用户从控制台下载的 CA，TLS 证书验证开启；连接项目标识与 Project URL 校验一致。
- 真实执行三项迁移：initial、import_previews、explicit_privileges；事务已提交。10 张业务表全部开启 RLS，owner policy 及组合外键生效；PUBLIC/anon 无业务表权限，authenticated 无 TRUNCATE 等多余权限。
- `meal-photos` 已建立且 `public=false`，文件格式仅 JPEG，Storage 策略绑定 owner/meal 路径。已有 Auth 用户 backfill profile，后续注册由 trigger 创建。
- `.env.local`、`supabase-ca.crt`、`test-results/` 已确认被 Git 忽略。仓库没有 service_role。

## 网络故障与修复

Windows 已有 Mihomo HTTP 代理 `127.0.0.1:7890`。项目域名 DNS 正常，但 Node 直连 TLS 被重置；`supabase.com` 和 npm Registry 的直连 TLS 正常。Node 未自动使用 Windows 代理。

仅在本地项目环境启用 HTTP_PROXY/HTTPS_PROXY、NODE_USE_ENV_PROXY，并用 with-env 启动器在 Node 网络初始化前加载。没有修改全局 DNS、系统代理开关、代理软件规则或关闭证书验证。localhost/127.0.0.1 绕过代理；生产部署不复制本地代理变量。

修复后真实 API：Auth Health 200；Auth Settings 200，Email enabled、Signup allowed、Confirm email required；匿名 profiles 查询 401/42501（预期权限拒绝）。

## 验证记录

- 真实会话测试已通过：测试账号密码登录、官方 SSR Cookie、重复 HTTP 请求读取同一 profile、refreshSession、退出后 API 401。
- 22 项本地单元/SQL 引擎测试通过；它们独立于真实服务验收，不混算。
- 真实双账号/照片测试已通过（exit 0）：两名不同账号 password login 200；动作、器材 INSERT 201；save_workout RPC 200；组数据读回/修改 200。
- 跨账号 session 查询为空、改写无匹配行；伪造 user_id 被 403/42501 拒绝，跨用户外键被 409/23503 拒绝。
- 真实 JPEG 上传 200；meal_photos 写入 201，并绑定本人/餐次；本人下载及签名链接下载字节与上传数据完全一致。B 查询照片元数据为空，B 签名/跨路径上传均被 Storage 400 拒绝；public 永久 URL 下载 400，未泄露照片。
- 测试自身对象删除 200，数据库按精确 UUID 删除 204，两个测试会话 local logout 204。早期网络失败轮次不计通过；其残留也已按清单清理，未改既有用户数据。
- 中断后本地 HTTP smoke 再次通过：已配置但未登录的私有页面跳转 /auth、业务 API 401。
- 中断后真实会话测试再次 exit 0；数据库只读复核三项迁移登记齐全，测试动作、器材、照片记录均为 0 残留。
- lint、strict typecheck、22 项单元/SQL 引擎测试通过，完整 npm audit 为 0 漏洞。Turbopack 构建携带本地代理时 CSS 子进程失败；仅隔离构建代理环境后生产编译、类型检查、页面生成和路由输出通过，启动脚本已固化此配置。

## 控制台与尚未覆盖的步骤

真实注册邮件投递、确认邮件与重置邮件点击尚未验收。控制台 **Authentication → URL Configuration** 设置 Site URL=`http://localhost:3000`，本地 Redirect URLs=`http://localhost:3000/**`。生产改为准确 HTTPS 域名及回调；面向非组织授权邮箱注册需配置 SMTP。具体邮件模板及操作见 `docs/supabase-setup.md`。

未部署 Vercel，未测试 iPhone 真机、多设备浏览器 UI 或用户的实际 Excel。真实服务的临时测试 JPEG 是明确测试输入，不是伪造用户饮食历史。
