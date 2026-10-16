# 身体目标、缓存与进入体验交付记录

日期：2026-10-16。基线提交：`45e6254`。本次工作未提交、推送或部署。

后续局部调整（同日）：根据用户反馈，进度条改为横贯卡片，起始/目标的 80×28px 数值框放在两端下方；取消“暂无测量记录”提示。用户决定暂缓当前测量值及完成度交互设计，无当前记录时中间留空，不新增测量入口或推定百分比。仅修改 BodyGoalCard.tsx 与 BodyGoalCard.module.css，原有保存/数据接口不变。新截图 `test-results/body-goals/endpoints-desktop.png`、`endpoints-mobile.png`；构建、Lint、类型及 53 项测试通过，桌面/窄窗口无卡片内部溢出。下文对空态“—”及旧布局的描述保留为初次交付记录。

## 范围与结果

保留原 Dashboard 的 PC 网格与其他卡片功能；替换身体目标空卡。起始/目标直接编辑、300ms 防抖、失焦提交，体重/体脂切换。只在出错时提供错误与重试，不显示正常保存状态。使用官方 shadcn Base Button/Progress 结构及实际 Base UI primitives，局部 CSS Module 适配现有主题，不初始化第二套全局主题。

身体目标与实际测量分开保存。百分比按 `(当前－起始)/(目标－起始)` 计算并夹取 0–100，支持两个方向；缺任何必要值或起始等于目标时显示 `—`。当前账户没有真实测量记录，因此实际界面不显示百分比。没有为测试写入假测量、训练记录或演示数据。

原数据库没有身体目标/测量表。本次两项增量迁移已通过现有迁移工具应用到 Supabase：新增 `body_goals`、`body_measurements` 和两个 security invoker RPC；新增表启用本人 RLS，未更改已有业务表的策略、认证配置或用户数据。未来接入设备所需的来源与来源记录 ID 已留字段，未实现硬件集成或测量录入页面。

## 保存与一致性

- 本地草稿先持久化，再发请求。每标签页拥有独立 outbox、每用户独立命名空间。
- 单写队列串行提交；只有相同序号的已确认输入可以被清除，旧响应不能删除新输入。
- RPC 按字段比较旧值，拒绝冲突；不同字段可合并。mutation ID 保证未知响应后的直接重试幂等。
- API 在正常鉴权、CSRF、RLS 之外核对草稿 owner_id，防止切换账号后旧队列写入新账号。
- 网络错误保留输入；online/focus、刷新恢复和手动重试可恢复。不同窗口的未提交内容先要求核对；若服务器已包含相同值则自动消解，无需重复写入。乐观值与已确认基准分别保存在缓存中。
- 多端使用重新验证策略，未引入 Realtime。聚焦/恢复网络/手动重试时读取最新身体数据；已有训练编辑器不因全局 focus 重取而卸载未保存表单。

## 实测性能

环境：Windows、本地 Next.js dev、真实 Supabase，项目区域 `ap-northeast-1`（东京）。本地出站经既有代理。样本数量有限，非线上负载测试，不能把冷编译和热运行混算为提速比例。

| 指标 | 修改前 | 修改后 |
| --- | --- | --- |
| 首次挂载本地 API 数 | 10 次，5 类读取在 StrictMode 下重复 | 5 次（包含新增身体数据）；三餐按需读取 |
| 身体卡片 Supabase 读取 | 原界面没有身体数据；本轮初版需 3 次读取 | 1 次 `body_overview()` RPC |
| 单个 API 样本 | 初始 10 次约 1.23–4.49 秒 | 正常登录样本 228–739ms；空闲后另次仍达 5.5–7.2 秒 |
| 有缓存刷新核心区域就绪 | 无同口径基线 | 两次约 1.23 秒、416ms；后者身体区域 455ms |
| 无页面缓存的新标签页 | 无同口径基线 | 核心 6.27 秒、身体 6.07 秒；外框 TTFB 135ms |
| 点击正常登录到核心就绪 | 无同口径基线 | 7.241 秒；身体 7.208 秒，包含真实密码认证与 Turnstile |

前测原始 TTFB 9.56 秒包含 Next 冷编译和公钥读取，不用它与后测 132–135ms 的热外框 TTFB计算速度倍数。缓存就绪不是网络完成：416ms 那次的后台读取仍有 5–7 秒波动。刷新复用了 5 项用户缓存，未靠延长动画隐藏网络等待。

只读 EXPLAIN：已有训练日期索引、身体目标主键与最新测量索引均被使用；样本 SQL 执行约 0.052–0.073ms，数据库往返约 140–143ms。训练和测量样本为空，不能外推到大量历史数据。没有证据支持“免费套餐导致 SQL 慢”，因此未盲目增加索引。

公开 JWKS 相同端点测试：新连接约 5.48–5.57 秒、复用连接约 196–201ms，HTTP/2 开关没有消除新连接开销。这支持本机网络/连接路径是显著成本的判断，但不能仅凭这个测试定位到具体代理或上游设备。其余优化包括并发池、请求去重、按需读取、用户隔离缓存、认证完成后的预取和公开公钥预热；严格过期、签名验证与 RLS 保留。

原始证据位于被 Git 忽略的 `test-results/body-goals/`：`before.json`（首次 10 项为前测，其余是后续 HMR）、`login-after.json`、`cached-refresh-after.json`（首次 5 项为该次挂载，后续为焦点/HMR）、`no-page-cache-after.json`、`database-diagnosis.json`、`transport.json`。截图含用户自填内容，不提交仓库。

## 页面连续性与开发会话

共享导航/容器保持稳定，服务端权限门后才挂载业务 Provider。无缓存保留相同卡片骨架和匹配大小的数据占位，不显示整页加载文案或遮罩；有缓存立即呈现，后台重新验证。进入动画 180ms、4px，支持 prefers-reduced-motion。

使用已有 Supabase SSR 浏览器客户端及真实 cookie 会话，未关闭 Turnstile/RLS、未设置模拟登录。已验证刷新、新标签页和重启本地 Next 服务继续使用登录态。当前 CUA 浏览器只暴露 viewport/visibility，不能指定 userDataDir 或创建 Playwright persistentContext，也不能验证整个浏览器进程关闭重启后的会话。没有创建另一套绕过鉴权的测试机制。预留目录 `.local/browser-profile/`、`.local/browser-auth/` 已加入 .gitignore，但没有导出 cookie/token/密码到文件。

本机 3000 被用户的 zerror 网课程序占用，未停止该程序；当前测试服务使用 `http://localhost:3001/dashboard`。

## 验证与限制

- `npm run lint`、`npm run typecheck`、`npm test`（53 项）、`npm run build`、3001 上 HTTP smoke 通过。包含真实 SQL 引擎的 RLS/事务/幂等/冲突测试，以及队列、防抖、缓存隔离与来源校验测试。
- 真实 Supabase PATCH 成功；刷新后原输入保留；指标切换后返回仍正确。浏览器连续使用等值数值格式编辑，最终只发一次提交，没有改变用户原目标。
- 真实故障演练为停止本地 Next 服务后恢复：15 秒超时保留输入，新标签页恢复草稿并重试成功。不是操作系统断网。浏览器工具没有离线网络模拟能力；真正断网/浏览器离线模式尚未实测。
- PC 1536×960、1280×800、1024×768，以及 768×900、430×932 检查同一组件树；无横向溢出或可见卡片重叠。窄窗口仅为同一卡片自然纵向排列，不创建第二套界面。手机为桌面浏览器视口模拟，未测试实体手机键盘。
- 新标签页无页面缓存时仍显示完整布局及数据占位，权限有效且无需重复登录。最新 Dashboard 未见 hydration 错误。正常登录记录两条 Turnstile onload callback 警告，但登录完成；本次没有修改验证码系统。
- 单元测试覆盖乱序/失败/恢复，未对两台真实设备同时修改实施压力测试；没有真实测量记录时，非空百分比只能由隔离 SQL/函数测试验证。
- `perf:navigation` 旧 CLI 脚本无法通过真实验证码，未把该失败脚本当作性能结果；上述登录时间来自用户亲自正常登录的浏览器测量。

## 依赖、许可和审查

新增运行依赖：`@base-ui/react@1.9.0`、`@tanstack/react-query@5.104.3`。安装时 npm audit 为 0 vulnerabilities。shadcn 的 MIT 来源与完整声明已追加至 THIRD_PARTY_NOTICES.md。

已将 BadGoods 的 `review-frontend-production` 原样安装到 `C:/Users/w4376/.codex/skills/review-frontend-production`，不作为 kuizFit 依赖。读取 README/SKILL/LICENSE-NOTICE 后，仅用于此次本地试用；公开可下载不等于开源或商业/修改/再分发授权，未作该等授权推定。未运行远程安装脚本或上传源码、证据、密钥。快速审查见 [quick-review.md](./body-goals-quick-review.md)，不是全站审计或上线认证。

## 文件清单

新增：

- `src/app/(private)/dashboard/loading.tsx`、`src/app/api/body/route.ts`
- `src/components/DevPerformance.tsx`、`src/components/ResourceProvider.tsx`
- `src/components/dashboard/BodyGoalCard.tsx`、`BodyGoalCard.module.css`、`DashboardSkeleton.tsx`
- `src/components/ui/button.tsx`、`progress.tsx`、`body-controls.module.css`
- `src/lib/body-goals.ts`、`goal-editor.ts`、`goal-drafts.ts`、`query-cache.ts`、`request-origin.ts`
- `supabase/migrations/202610160001_body_goals.sql`、`202610160002_body_overview.sql`
- `tests/body-goals.test.ts`、`query-cache.test.ts`、`request-origin.test.ts`
- 本报告与 `docs/body-goals-quick-review.md`

修改：

- `.gitignore`、`THIRD_PARTY_NOTICES.md`、`package.json`、`package-lock.json`
- `scripts/prepare-supabase.mjs`、`scripts/smoke.mjs`、`supabase/setup.sql`
- `src/app/(private)/layout.tsx`、`loading.tsx`、`src/app/api/sessions/route.ts`
- `src/components/AppShell.module.css`、`AuthForm.tsx`、`Checkins.tsx`、`SignOut.tsx`、`resource.ts`
- `src/components/dashboard/Dashboard.module.css`、`DashboardWorkspace.tsx`、`TrainingMonthCalendar.tsx`、`useDashboardData.ts`
- `src/instrumentation.ts`、`src/proxy.ts`、`src/lib/api.ts`、`client.ts`、`supabase/claims.ts`、`supabase/transport.ts`
- `tests/migrations.test.ts`、`tests/public-keys.test.ts`

未删除旧业务模块。认证页只改成功后的预取/导航与开发计时，没有视觉改版。后续待办是实际测量数据来源、实体设备/完整浏览器进程重启验收，以及新连接延迟的网络侧定位；本轮不扩展其他分析系统。
