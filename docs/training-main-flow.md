# 训练主流程与排行榜调整

范围：2026-10-16。本轮继续复用现有 Supabase Auth、目录 API、训练事务与签到 RPC。没有新增依赖、数据库迁移、生产配置或真实测试记录。

## 页面与功能

- 主导航为“控制台 / 配置 / 排行榜”。`/train` 上方管理训练与已保存计划，下方管理动作与器材；`/catalog` 重定向到 `/train#catalog`。
- 开始训练进入 `/session/new?active=1`。已有计划通过 `template` 参数复制；所有训练、动作记录、组记录生成新 ID，原计划保留。
- 动作选择支持搜索、肌群筛选、主动添加现有预设和自定义动作。自定义与预设沿用真实 `/api/catalog` 保存，没有假成功状态。
- 逐组主行展示组别、上次、重量、次数及完成。历史仅查询当前日期之前、同动作且同器材的非计划记录，只展示已完成组，并按组别角色对齐。
- “沿用上次”和“复制上一组”沿用重量、次数与组别，不复制完成状态、RIR、RPE 或力竭结果。
- 计量规则、单位、计划重量、RIR/RPE、标签、备注与排序删除仍在组设置中。更换器材不会改写已有组的重量含义。
- 训练历时以开始到结束的墙钟时间计算，包含休息与暂停，不冒充净运动时长。
- 休息向上计时。完成组自动开始，也可手动开始/结束；无目标倒计时、到时提醒或秒数加减。休息开始时间在本机按用户与训练 ID 隔离保存；训练记录仍需手动保存。
- “结束训练”通过原有保存事务成功后显示总结；失败保留草稿与错误信息。总结只统计已完成组，重量×次数按单位和计量规则分开，不推算辅助重量或未知重量。
- 排行榜采用真实签到榜单，左侧约 2/3，右侧签到和上榜设置。每页 10 人，保留服务端并列名次；沿用服务端最多 50 人的范围，没有假用户或假头像。

## 修改文件

路由与接口：

- `src/app/(private)/catalog/page.tsx`
- `src/app/(private)/session/[id]/page.tsx`
- `src/app/api/sessions/route.ts`
- `src/app/api/history/route.ts`

组件与样式：

- `src/components/AppNavigation.tsx`
- `src/components/Training.tsx`
- `src/components/Catalog.tsx`
- `src/components/SessionEditor.tsx`
- `src/components/ExerciseEditor.tsx`
- `src/components/SetEditor.tsx`
- `src/components/WeightInput.tsx`
- `src/components/Checkins.tsx`
- `src/components/dashboard/DashboardWorkspace.tsx`（开始训练与计划入口、计时工具状态）
- `src/components/resource.ts`（允许按需启用查询）

新增：

- `src/components/ExercisePicker.tsx`
- `src/components/Training.module.css`
- `src/components/Leaderboard.module.css`
- `src/components/useTrainingClock.ts`
- `src/lib/training.ts`
- `tests/training.test.ts`
- 本文档

其他修改：`src/lib/checkins.ts` 的分页函数、`tests/database.test.ts` 的隔离保存验证。

## 验证与限制

- 40 项测试通过，包括 PGlite **内存数据库**执行现有 SQL/RLS/事务以及“保存计划 → 复制训练 → 完成再保存 → 原计划不变”。测试不读取生产凭据或连接远程数据库。
- TypeScript、ESLint、正式构建、本地 HTTP 访问控制 smoke 通过。
- 在已登录的本地网页检查配置页、真实空榜、动作搜索、自定义动作展开及空名称禁用、休息正计时、停止休息、暂停/恢复。
- PC 1440px 与 1024px 检查页面，已修复实际渲染发现的 dialog 默认 margin 被全局重置而靠左上角的问题，以及训练控件区域的多余边框与间距。
- 截图保存于忽略目录 `test-results/training-main-flow/`。
- 当前账号没有动作、计划及上榜用户。没有向真实账号写入用于展示的训练、动作或榜单数据。因此真实账号下的历史逐组显示、完整训练提交及多用户翻页尚未端到端验证；对应的数据规则和事务在隔离测试中验证。
- 本轮保留手动保存，不新增自动保存或崩溃恢复。没有独立计划命名字段，列表用动作名称和日期识别计划。
- Apple Watch、训练媒体、健身房、公开分享、社区计划不开发。没有扩展数据分析系统或手机布局。

登录/注册、认证配置、数据库结构与真实用户数据均未修改。
