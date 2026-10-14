# Fitness Journal

第一阶段的个人训练与三餐日志 Web App。中文、移动端优先、同时支持桌面浏览器。业务数据存入 Supabase PostgreSQL，认证使用 Supabase Auth，照片使用私有 Supabase Storage；不使用 localStorage 作为业务数据库。

**已接入 Supabase 项目 kuizfit，首版已部署到 https://kuizfitcdcc.vercel.app。** 本地参数保存在被 Git 忽略的 `.env.local`；真实接入步骤见 `docs/supabase-setup.md`，最新服务验证见 `docs/supabase-validation.md`。无配置的新环境仍显示明确提示，不提供虚构训练或模拟保存。

2026-10-14 更新：首页统一为“控制台” `/dashboard`，铺满窗口的白底三列布局，保留深色及彩色卡片。大日历横跨两列，训练位于第三列；下方为签到、合并的三餐入口及末尾空白中型卡片。手机日历占满一行，其余卡片双列，展开餐食编辑时临时占满一行。日历可切换年月和选中日期：灰点表示无分类，蓝点表示力量日，绿点表示有氧日；同一天可同时显示两类。保存训练时可选训练类型，旧记录不猜测分类。三餐用页签切换，未保存的备注在餐次切换时保留。卡片后续内容仍待用户决定，没有填充模拟图表或新增统计。

顶部为圆角玻璃导航，个人账号菜单独立于右上角；排行榜为 `/leaderboard`。独立历史查询已移除，既有训练仍可按控制台日期查看，已删除训练可在当天折叠区恢复。旧 `/journal` 保留有效日期并跳转控制台，旧 `/history` 也跳转控制台。菜单加载排查与实测范围见 `docs/navigation-performance.md`。这次源代码改动尚未提交或上传，需通过 GitHub Desktop 提交到 main 并 Push origin，由 Vercel 自动部署。

签到每日一次，日期由数据库按个人设置的时区计算，不允许客户端补签。昨天的连续记录保留至今日结束；漏签一天归零。默认不上榜，用户在榜单的“我的上榜设置”填写独立昵称并主动开启；关闭后移出榜单，自己的签到保留。其他已登录用户只能看到上榜者的昵称、连续天数、排名，不共享邮箱、用户 ID、训练、三餐及原始签到明细。榜单显示前 50 位，天数相同并列。

本次已在原 Supabase 追加 `202610140001_checkins.sql`，现有迁移和数据保留。新环境仍按迁移流程安装；迁移完成会通知 PostgREST 刷新结构缓存。`npm.cmd run test:checkins` 使用两个本地配置的测试账号和运行中的本地服务器验证真实接口，结束后恢复测试账号设置并清理本次签到。

## 本地启动

需要 Node.js 22.13+（本次使用 24.14.1）及 npm。PowerShell：

```powershell
npm.cmd ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
# 编辑 .env.local，填写下面三个参数
npm.cmd run dev
```

打开 http://localhost:3000。手机需在同一局域网，通过电脑 IP:3000 访问，并将对应地址加到 Supabase Redirect URLs。生产环境必须 HTTPS；iPhone 真机测试在部署后进行。

| 变量 | 来源与用途 |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Supabase 项目 URL |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | 项目 Publishable Key（旧项目也可用 anon key）；结合 RLS 使用 |
| NEXT_PUBLIC_SITE_URL | 本地 http://localhost:3000，生产为准确的 HTTPS 网站域名 |

不需要 service_role；不要将其填入任何 NEXT_PUBLIC 变量。`.env.local` 不提交。Next.js 的公开变量在构建时注入，改动生产变量后重新部署。

## 建库与认证配置

1. 新环境创建 Supabase 项目后，使用 `npm.cmd run supabase:migrate` 执行目录中的迁移（需本地数据库连接和 CA）；或在 SQL Editor 执行生成的 `supabase/setup.sql`。已有 kuizfit 已完成五项迁移，无需再次手动建表。脚本通过私有迁移记录表跳过已执行版本，保留数据；若未来改用 Supabase CLI，先同步迁移历史，不要直接重复推送初始 CREATE TABLE。
2. 表、RLS、组合外键、私有 `meal-photos` bucket 及 Storage 策略均由迁移创建。Auth 用户创建时自动建立 profile。
3. Auth → Providers 启用 Email/password，开启 Confirm email。设置至少 8 位密码；按项目需要配置密码强度及 Auth 速率限制。
4. Auth → URL Configuration：Site URL 为生产 HTTPS 域名。Redirect URLs 添加本地与生产的 `/auth/callback`，以及 `/auth/callback?next=/auth%3Fmode%3Dupdate`。本地手机测试再添加准确的局域网地址。
5. 配置自己的 SMTP 发信服务后再公开开放注册。Supabase 默认邮件服务存在发送限制，不应当作生产邮件方案。使用默认 `ConfirmationURL` 模板可通过 PKCE callback 完成同浏览器认证。
6. 如果需要跨浏览器/设备点击邮件，推荐邮件模板改用 token_hash：确认邮件链接为 `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup`；重置邮件链接为 `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery`。回调同时支持 code 和上述 token_hash，重置成功进入设置新密码页。
7. 注册新用户，完成邮件认证，登录；添加动作与器材后创建训练。配置失败/网络错误不会提示保存成功。

## 使用范围

- 控制台：大月历、年月切换、日期选择、今天、训练分类标记、同日多次训练、编辑与软删除。
- 训练：开始、逐组输入、完成标记、暂停/恢复和结束；**需点击保存训练**。没有自动休息计时器。
- 器材：六类器材、kg/lb、未知初始质量、左右独立装载、插片不规则档位、单只哑铃和辅助重量。总质量不代表机械阻力。器材配置软删除，历史保存快照。
- 组：热身/正式/补充角色，多个附加标签，计划重量、实际重量、备注、RIR/RPE、完成时间和休息字段。
- 三餐：备注、多图、相册/拍照、预览、替换、软删除与恢复。压缩成最大 1600×1600 的 JPEG，去除 EXIF。照片无公开永久地址；预览签名 URL 有效期 10 分钟，刷新页面可重新获得。
- 既有记录：通过控制台选中日期查看与编辑，恢复当天已删除训练。导入器材原文保存在动作备注中，不猜测类型。
- 导出：CSV 防公式注入；JSON 包含各业务表与照片备份链接，包括软删除的数据。

## Excel 支持与限制

支持 `.xlsx`，最多 3 MB、解压 30 MB、单工作表 5000 行/80 列。文件格式与 ZIP 体积在解析前检查。ExcelJS 读取普通工作簿、公式缓存值、合并单元格、工作表媒体与图片锚点。

自动识别常见中文/英文表头并允许调整表头行号和逐表字段映射。支持完整年月日、Excel 日期单元格、`15kg × 4组 × 8次`、`17.5kg × 4次`、`40kg*8`。没有固定用户工作簿假设。缺少年份、无法读取的公式结果、复杂文字表达或重量含义都需要手动填写/排除。

每表默认重量含义和计划/实际类型必须由用户确认；预览可逐行编辑日期、动作、器材原文、重量、次数、组数和角色。组标签可在导入后的编辑器补充。一个表同一天同类型默认合为一次训练，不同表/不同类型分别生成；多次同日训练的精细拆分需要分别放在工作表或导入后手动整理。

**嵌入图片不自动导入。** ExcelJS 可报告图片与锚点，但锚点无法证明日期/餐次。本阶段列出所有可识别图片及未知锚点媒体，确认后导入文字记录；按相应日期手动上传照片。工作表背景图同样报告未导入。不要将此视为完整工作簿媒体导入。

预览保存在用户独立的 `import_previews` 中，24 小时过期，不属于已确认训练数据。确认后一次 RPC 事务提交全部训练，失败整批回滚。批次报告保存源行、确认行、排除行、未导入图片及警告。文件 SHA256 相同则拒绝重复（已撤销文件也拒绝）；相同内容另存导致字节变化不属于文件级重复检测。

撤销批次只软删除版本未改变的训练。用户编辑后整个训练保留；直接修改子组也触发父记录版本变化。撤销后的训练可在对应日期控制台的“已删除记录”中恢复。预览数据可由项目管理员定期执行 `delete from public.import_previews where expires_at < now()` 清理。

## 照片和备份

每张输入上限 3 MB，适配 Vercel Function 4.5 MB 请求限制，多图逐张上传。大照片需要用户先压缩。HEIC/HEIF 使用 sharp 尝试解码：具体取决于部署的 libvips/HEIF 编解码支持，不能承诺所有 iPhone HEIC 均可转换；不支持时明确提示导出 JPEG。当前只保留去元数据的压缩版本，不保留定位信息和原图。

上传先写文件，再写数据库；数据库失败会尝试删除文件，清理失败会明确报告。对象存储与 PostgreSQL 之间不存在跨服务事务，进程中断仍可能产生孤立文件。定期在管理员环境对照 `storage.objects` 与 `meal_photos.storage_path` 检查，先人工复核再清理；不要在客户端放管理员密钥。软删除照片保留 bytes 以便恢复，签名链接到期前仍有效。

导出完整 JSON 后，一小时内备份照片：

```powershell
node scripts/backup-photos.mjs "fitness-journal.json" "photo-backup"
```

保存 JSON 与照片目录在同一备份位置。此工具仅在用户明确运行时访问导出的本人签名链接，保留 `user/meal/photo.jpg` 关联路径。链接过期时重新导出；JSON 的短期 URL 属于访问凭据，应妥善保管。重建数据库可依据导出字段及迁移开发恢复工具；本阶段没有自动全量 JSON 回灌。

## 测试与构建

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd audit
```

测试涵盖重量含义、时区、正式组统计、CSV、真实生成工作簿解析、计划/实际、压缩文件限额、照片压缩/隐私，以及 PGlite PostgreSQL 引擎执行真实迁移的 RLS、Storage SQL 策略、外键、版本冲突、事务回滚及批次撤销。PGlite **仅为测试工具**，应用仍只连接 Supabase。

真实服务集成检查（需要两名不同的已认证测试账号；不要使用生产用户）：在 `.env.local` 中填写 `TEST_USER_A_EMAIL/PASSWORD` 与 `TEST_USER_B_EMAIL/PASSWORD`，运行 `npm.cmd run test:db`。脚本检查 PostgREST、Auth、私有 Storage 的双账号隔离并清理自身创建的记录，不使用 service_role。

本地页面 smoke 检查脚本：先启动 app，再运行 `npm.cmd run test:smoke`。未配置模式应显示明确阻塞，API 返回 503，私有页面返回配置页；配置后未登录 API 应返回 401，私有页面进入登录页。它不代替登录后的业务端到端测试。

本次实际测试结果及未验证项见 `docs/validation.md`，各阶段交付见 `docs/progress.md`。没有真实用户 Excel 样本，因此不能宣称已适配用户自己的文件；没有 iPhone 真机，因此不能宣称 Safari 拍照/键盘已完成真机验收。

## Vercel 部署

1. 将本项目提交到自己的 Git 仓库，Vercel 导入，Framework 选择 Next.js，Node 选择 24.x（至少满足依赖要求）。构建 `npm run build`，依赖安装 `npm ci`。
2. 建立 Supabase 生产项目并执行迁移；确认私有 bucket、所有业务表 RLS 都已启用。开发测试项目与生产数据分离。
3. Vercel 配置上表三个变量，`NEXT_PUBLIC_SITE_URL` 为正式 HTTPS 域名。不要填入 service_role。
4. 更新 Supabase Site URL、邮件回调白名单与 SMTP。部署后分别在 iPhone Safari、Windows 浏览器注册/登录，验证同账号跨设备数据一致。
5. 用两个测试账号执行隔离脚本，再按 `docs/validation.md` 的验收路径完成训练、照片、导入、撤销及导出。未完成这些步骤前不要宣称生产验收通过。
6. 设置数据库备份、存储备份、项目配额和故障告警。大型工作簿/海量导出后续需要后台任务，当前第一阶段采用有明确上限的同步请求。

## 目录

`src/app` 路由/认证/API；`src/components` 功能 UI；`src/lib/domain.ts` 统一模型/计算；`src/lib/import` 解析与转换；`src/lib/repository.ts` 查询；`supabase/migrations` schema 与事务；`tests` 单元/数据库引擎测试；`scripts` 实服务隔离和照片备份。

参考依据：[Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)、[Storage RLS](https://supabase.com/docs/guides/storage/security/access-control)、[ExcelJS 图片](https://github.com/exceljs/exceljs#images)。依赖许可证以锁文件对应版本为准：Next.js/React/Supabase/ExcelJS/JSZip 为 MIT，sharp 为 Apache-2.0；本项目不复制第三方产品界面。
