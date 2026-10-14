# Supabase 真实接入验证

日期：2026-10-14（Asia/Shanghai）。项目 kuizfit，Project URL 标识 `rgrekxlrkgnqdvhujeks`。在原工作区接入，没有重新创建应用或重置数据库。无完整密钥、连接密码或账号密码写入本报告。

## 2026-10-14 首次加载修复追加验证

- 追加公开公钥启动预加载、五分钟严格缓存与并发合并；本地代理使用官方 Undici 连接复用，实际协商 h2，TLS 验证开启。仅公开公钥共享，不缓存用户响应，不修改系统网络配置。Vercel 使用正常网络传输。
- 27 项单元/SQL 测试、lint、类型检查、生产构建通过；独立 localhost:3001 生产实例重新通过真实会话测试与双账号日历测试，包含刷新、退出拒绝、写入读回、跨账号隔离和伪造签名拒绝。测试数据已按自身 UUID 清理。
- 初轮构建遇到生成缓存的 CSS 子进程退出，保留原缓存到被忽略的 test-results 后重建通过；测试结果目录从 TypeScript 源码扫描中排除。来源不匹配的初轮 403 不计通过，未放宽 Origin 检查。
- 服务预热后首轮控制台 HTTP 响应 351 ms，训练/三餐/签到数据 902/1412/2126 ms。启动预热仍为 5903 ms，长时间断线重连仍可能等待；线上未上传，不能把本地数据称为 Vercel 验收。详见 navigation-performance.md。

## 2026-10-14 控制台与训练分类追加验证

- 在原库应用第五项迁移 `202610140002_training_type.sql`，追加 nullable 的力量/有氧字段，保留旧记录与原迁移校验和。旧客户端省略类型字段时保留既有分类，RLS、私有 Storage 与事务保存行为保持。
- 26 项本地单元/SQL 引擎测试通过。真实 `test:calendar` 通过：A 保存并读回力量和有氧训练、同日产生双标记，B 无法读到 A 的记录；旧格式更新保留分类，伪造 JWT 签名返回 401。临时训练用精确 UUID 和所有者清理，没有删除既有数据。
- 调整认证访问：页面及读取接口用官方 SDK `getClaims` 验证签名和过期时间，写入接口继续实时 `getUser` 并校验来源；API 不再同时经过重复的入口认证。读取依赖有效 JWT，到期前不逐次查询 Auth 撤销状态，数据库 RLS 继续按该 JWT 的身份执行。
- 调整后真实 `test:session` 通过：密码登录、SSR Cookie 持久化、重复读取、刷新与退出后 401；未登录 smoke 检查也通过。完整生产构建通过。菜单耗时证据及冷启动限制见 `navigation-performance.md`。
- 浏览器验证年月切换、闰年日期、三餐备注草稿在餐次切换时保留、320px 导航无溢出、桌面三列。未进行 iPhone/Edge 真机验收，也没有在本轮重新执行照片上传测试；下文照片结果属于此前真实服务测试。
- 本地代码尚未推送，线上首版不包含这些更改。下面记录各阶段历史验证。

## 2026-10-14 连续签到榜追加验证

- 在同一真实数据库应用第四项迁移 `202610140001_checkins`，增加 daily_checkins 与 checkin_preferences；12 张业务表启用 RLS。既有三项迁移通过校验和后跳过，没有重建或改写旧表。
- 原始签到仅本人 SELECT，authenticated 没有 INSERT/UPDATE/DELETE/TRUNCATE；签到只能调用不接受日期和账号参数的 daily_checkin。上榜设置仅本人可读写，默认不上榜。受限的 checkin_dashboard 只向已登录用户返回主动上榜者的昵称、连续天数、并列排名和“是否本人”，不返回用户 ID、邮箱或原始签到。
- 23 项本地测试通过，包括 PostgreSQL 引擎上的连续签到、漏签、昨天宽限期、重复点击、默认私有、跨账号隔离、退出榜单、并列排名、无效时区回退和匿名拒绝。它们与真实服务测试分别记录。
- `npm run test:checkins` 已使用本地两名测试用户执行真实 Auth 与本地 HTTP 接口：登录、服务端当天签到、重复写入只有一条、读回持久记录、A 上榜后 B 可见、A 退出后 B 不可见、B 无法读取 A 的原始签到/设置、拒绝补签参数、拒绝直接写表、匿名 401、导出仅含本人数据。测试后恢复原上榜设置并清理此次新增签到。
- 在真实登录的浏览器检查日志与排行榜桌面/手机布局。显示真实空状态，没有向界面填充演示排行榜或训练历史。
- 代码更新尚未推送到 GitHub/Vercel；首版线上部署状态不代表这些本地新功能已上线。下面为首次接入的历史验证记录。

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

首次接入时尚未部署 Vercel；随后用户已部署首版，本轮新增代码尚未上传。未测试 iPhone 真机、多设备浏览器 UI 或用户的实际 Excel。真实服务的临时测试 JPEG 是明确测试输入，不是伪造用户饮食历史。
