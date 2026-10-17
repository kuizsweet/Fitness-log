# kuizFit 查询、缓存与品牌修复验收

日期：2026-10-17。范围：训练读取、共享缓存、相关加载状态和用户可见品牌；没有重排 Dashboard、恢复旧 Dashboard、添加运行时依赖或更改认证流程。

## 根因及修复

| 原位置 | 证据与问题 | 当前行为 |
| --- | --- | --- |
| `src/app/api/sessions/route.ts`、原 `src/lib/repository.ts` | 计划/进行中查询范围为 0001–9999；`allRows` 每 500 条分页，再按 100 个父记录分批、串行读取动作及组 | 交互查询夹取至 2020-01-01–2030-12-31，按用户、日期、状态、训练类型筛选，确定性排序和 LIMIT；嵌套 PostgREST 一次取得选中记录的动作/组 |
| 原 `DashboardWorkspace.tsx` PlanCard | 读取全部计划后在客户端筛选、排序，找下一次力量训练 | 服务端 `planned + strength + 日期下界 + 升序 + LIMIT 1` |
| 原 `useDashboardData.ts` | 月历读取整月完整训练树，再提取日期标记 | 只读当月按日期/类型/状态聚合的标记；完整记录仅加载选中日 |
| 原 sessions ID 分支 | 先查日期，再读同日全部记录，最后按 ID 筛选 | 按当前用户及 ID 查询一个记录树；保留旧数据的 ID 深链接，不给导出截断日期 |
| 原 `api/history` | 获取多条父记录，再在客户端找有效完成组 | SQL 关系筛选力量训练及已完成组，降序 LIMIT 1；无数据直接返回空 |
| 原 `resource.ts`、`ResourceProvider.tsx` 等 | 详情不缓存，键仅含路径；多处 focus/online 强制失效；每次缓存事件序列化整个快照 | 复用已有 TanStack Query，键包含用户及规范化查询参数；移除训练重复监听和查询快照持久化 |
| `SessionEditor.tsx` | 内部普通 a 链接会完整刷新、丢失内存缓存 | 使用 Next Link；当天/计划列表中的完整记录直接预填详情缓存 |
| private loading 文件 | 路由等待时显示单独整页占位，无法利用已有卡片数据 | Dashboard 路由等待时使用同一组缓存读取组件；卡片各自处理初始空位、错误和重试 |

未发现逐日/逐月扫描空日期的循环，不能把这一点当作已证实的旧问题。已证实的是无界批量读取、串行关联查询和缓存失效问题。保留的分页仅用于用户主动浏览列表：计划/进行中/回收站每页 20 条、单日记录每页 100 条，额外 1 条判断下一页；不会自动翻页找记录。

计划仍是已有的独立 planned 训练记录，没有持久化轮换队列或完整轮换功能。本次没有新造轮换系统，有氧也没有新增推进力量队列的逻辑。

## 缓存和一致性

- 现有私有布局维持稳定的每用户 QueryClient。新鲜期 60 秒，闲置保留 15 分钟；切换账号/退出清除缓存，旧账号响应不能填入新账号缓存。
- 同一用户、同一查询参数（包括日期、类型、页码）复用查询；不把不同范围列表误当作相同数据。列表内已有的完整记录可填入精确 ID 详情缓存。
- 登录认证完成后沿用已有预取入口，只预取资料、身体、签到、当月、当天、下一条力量计划，不预取全部历史。
- 写入成功后立即更新相关缓存：新旧日期的记录、计划/进行中、详情及月历计数；取消相关旧读取，拒绝较旧 revision 覆盖；只重新读取挂载中的相关查询，其他相关查询标为过期。其他月份保持新鲜。
- 失败的写入不广播成功事件，不改写已确认缓存；原训练编辑器保留本地输入及错误处理。身体数据沿用已有 GoalEditor/MeasurementEditor、草稿及重试机制，只适配新的用户缓存键。
- 不新增离线/查询持久化机制；退休原查询 sessionStorage 快照。刷新后重新读取，但布局不清空为整页黑屏。已有未保存草稿与认证 cookie 不受此调整影响。
- 不引入 Realtime；保留新鲜度控制、窗口恢复/网络恢复时的过期数据重新验证。超过 60 秒后出现后台读取是预期行为，已有内容继续可见。

## 实际测量

使用已登录的 localhost:3001 浏览器与真实 Supabase，正常验证 cookie、JWT 和 RLS。测量来自浏览器同源 Resource Timing、开发服务器日志及临时只读诊断中的 Supabase 请求计数；没有使用原生 DevTools Network 面板。临时诊断 API/页面已删除，不进入交付或生产构建。

真实库当时训练记录和计划均为 0。旧查询源码在忽略目录中保留用于对照；新旧在同一账号、相同连接工具下配对执行。每项均返回 0 行，各 1 次数据库请求。

| 查询 | 第一次对照：旧 → 新（ms） | 第二轮：旧 → 新（ms） | 再次运行第一轮 | 再次运行第二轮 |
| --- | --- | --- | --- | --- |
| 当月 | 5918 → 380 | 197 → 193 | 569 → 232 | 194 → 583 |
| 当天 | 198 → 200 | 206 → 209 | 643 → 214 | 182 → 187 |
| 全部旧计划 → 下一力量计划 | 334 → 186 | 773 → 215 | 197 → 187 | 205 → 177 |

这些空库样本不支持声称 SQL 提速了某个固定百分比。第一次旧月历 5918ms 包含冷连接影响，不能用它计算改写月历带来的提速。非空情况下旧实现至少串行读取父记录、动作、组；新实现为一个嵌套请求，这一请求结构由 SDK 查询契约测试验证，未伪称已在真实大库测得倍率。

页面实测：

- 一次完整首次登录点击至核心数据就绪：13737ms（含 Supabase 登录及开发环境影响）。没有取得修改前整页登录流程的可比样本，因此不提供整页前后加速倍率。
- 最终一次冷刷新：文档 TTFB 161ms、DOMReady 229ms；核心数据就绪 6233ms、身体数据 5954ms。6 个成功业务请求：签到 632ms、身体 5538ms、资料 5538ms、下一力量计划 970ms、当天 247ms、月历 406ms。
- 训练记录页返回 Dashboard：在 60 秒新鲜期内的实测新增业务请求 0，缓存卡片立即可见。首次打开编辑器仍需读取动作库；没有创建或保存虚构训练。
- 超过 60 秒后再次往返：发生后台重新验证，缓存界面继续显示；不是整页骨架替换。开发 Strict Mode 有中止后重发的请求，状态 0 不计为成功返回，原始证据保留两者。
- 同月从 10 月 17 日选择 16 日：只新增该日详情请求，428ms；不重读整月，不扫描其他日期。
- 配置页首次只读进行中列表、计划列表和动作库；各为限定分页的独立请求。资料及返回 Dashboard 的缓存继续复用。

冷连接未解决项：独立新建代理连接池并发读取同样三个空/少量结果，4 连接总计 6084ms，1 连接总计 6329ms，均成功；暖查询通常约 0.2 秒。本地代理/外部连接建立是明显嫌疑，但没有包级证据可断言具体 TLS/DNS 故障。未因此更换项目区域、修改用户代理配置或归因于免费套餐。首屏冷加载仍有 5–6 秒级延迟，不能宣布所有慢加载已消失；需在正式 Vercel 环境另测。

索引与 SQL：检查了真实库现有索引，新增 `sessions_live_lookup` 部分索引及 `training_calendar` 只读 INVOKER 函数，迁移已通过现有迁移器应用。保留现有表字段、RLS 和真实数据。空库 EXPLAIN 在索引添加后测得：旧计划查询形状执行 0.076ms、新查询形状 0.054ms；两者均为索引后的空表结果，不能称为索引前后对照或真实大库性能结果。

原始本地证据位于已忽略的 `test-results/training-performance/`（JSON、截图）、`test-results/training-indexes*.json`、`test-results/training-tests.txt` 和 `test-results/training-build-final.txt`，不含密码、token 或训练明细。

## 验收和限制

- `npm test`：65/65 通过。覆盖日期/限量/单次 SDK 请求、用户键隔离、详情缓存预填、保存/删除/恢复联动、旧 revision、晚到读取、导出记录保留。独立 PGlite PostgreSQL 中验证空/少量/20000 条记录、RLS 用户隔离、单月聚合与最近力量计划；没有把这批数据写入真实库。
- `npm run typecheck`、`npm run lint`、`git diff --check` 通过。
- `npm run build -- --webpack`：最终生产构建通过；构建路由列表没有临时诊断入口。默认 Turbopack 在本机仍遇到子进程创建相关 panic；未修改全局构建配置来掩盖它。
- 匿名 HTTP smoke 通过，未登录业务/API 仍受保护；真实登录后 Dashboard、配置、训练编辑器与日期选择实际打开，读取成功。
- 1536×960 和浏览器原尺寸约 755px 已实际渲染；桌面无横向溢出，保留同一深色布局；未修改 Dashboard CSS 或开发移动端新布局。完整桌面截图为 `test-results/training-performance/dashboard-desktop-full.png`。
- 修正实测发现的语言按钮服务端/客户端初始属性不一致，避免恢复语言偏好时 hydration 警告；登录计时只绑定当前文档内登录动作，刷新不再累计上次登录后的时间。
- 未在真实用户库写入测试训练、执行删除/恢复或大批导入，因此这些真实写操作的端到端回归仍未验证；对应缓存和数据规则有隔离测试覆盖。
- 邮件模板品牌已修改源文件，未改 Supabase Dashboard 实际邮件配置。域名、内部存储键、包名等技术标识保留原形式，用户可见品牌为 kuizFit。
- 未提交、推送或部署。本地验收不等于 Vercel 正式环境验收。

## 修改文件

新增：

- `src/lib/brand.ts`
- `src/lib/resource-keys.ts`
- `src/lib/session-hydration.ts`
- `src/lib/training-cache.ts`
- `src/lib/training-queries.ts`
- `src/lib/training-read.ts`
- `supabase/migrations/202610170001_training_reads.sql`
- `tests/training-cache.test.ts`
- `tests/training-read.test.ts`
- `docs/loading-performance-2026-10-17.md`

修改：

- API/查询：`src/app/api/sessions/route.ts`、`src/app/api/history/route.ts`、`src/app/api/export/route.ts`、`src/lib/repository.ts`、`src/lib/query-cache.ts`、`src/lib/client.ts`、`src/lib/calendar.ts`、`src/lib/domain.ts`。
- 缓存接入：`src/components/ResourceProvider.tsx`、`src/components/resource.ts`、`src/components/Checkins.tsx`、`src/components/SessionEditor.tsx`、`src/components/Training.tsx`。
- Dashboard 数据/状态：`src/components/Dashboard.tsx`、`src/components/DevPerformance.tsx`、`src/components/dashboard/BodyGoalCard.tsx`、`src/components/dashboard/DashboardSkeleton.tsx`、`src/components/dashboard/DashboardWorkspace.tsx`、`src/components/dashboard/DeletedRecords.tsx`、`src/components/dashboard/TrainingMonthCalendar.tsx`、`src/components/dashboard/useDashboardData.ts`、`src/app/(private)/dashboard/page.tsx`、`src/app/(private)/dashboard/loading.tsx`、`src/app/(private)/loading.tsx`。
- 品牌/相关文字：`src/components/AppNavigation.tsx`、`src/components/AuthForm.tsx`、`src/components/Settings.tsx`、`src/app/layout.tsx`、`src/app/page.tsx`、`src/app/auth/page.tsx`、`src/app/auth/callback/route.ts`、`supabase/templates/confirm-signup-otp.html`；登录 UI 结构不变。
- 数据库合并安装脚本与现有日期测试：`supabase/setup.sql`、`scripts/test-calendar.ts`。

没有新增依赖、删除业务 Service/API、清空用户数据或恢复旧 Dashboard。
