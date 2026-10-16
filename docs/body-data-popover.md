# 身体数据 Popover 局部调整

2026-10-16。仅调整身体目标的数据编辑入口与对应测量保存，保留原 Dashboard 网格及 Progress 动效。未提交、推送或部署。

## 页面行为

- 卡片左侧「数据」与右侧指标切换均为同一 Base Button；实测都是约 41×28px，保留相同 hover/focus/按键行为。
- 两端不再是输入框；左端展示所选指标的起始值，右端展示目标值。输入全部迁入 Popover。
- 使用用户提供的 shadcn Base Popover 组合：Root、Trigger(render Button)、Portal、Positioner、Popup、Title。未增加组件库依赖，沿用已安装的 `@base-ui/react`。
- 弹层六项：起始/目前/目标体脂，起始/目前/目标体重。原需求重复的第四项「起始体脂」按「起始体重」处理。
- 两列三行；普通状态无内部滚动。最大宽度为卡片宽度减16px，最大高度为卡片高度减16px，同时服从可用视口。弹层是标准浮层，可覆盖相邻区域；限制的是尺寸，没有把它强行塞成卡片内常驻面板。
- Escape、再次点击触发器及点击外部均可关闭；Escape 动画结束后焦点返回「数据」。关闭后输入不残留在卡片 DOM 中，原始草稿仍保留在保存队列。

## 数据与保存

起始/目标沿用 `GoalEditor` 和 `save_body_goal`。目前值使用独立 `MeasurementEditor`，保存到已有 `body_measurements`，不混写目标表字段。输入即时反映到本地缓存与进度，300ms 防抖、失焦或关闭时提交。缺当前测量时仍为空态。

新增增量迁移 `202610160003_body_measurement_write.sql` 已实际应用：仅新增 security invoker RPC `save_body_measurement`，没有新建表、改动已有 RLS、删除或重写历史记录。函数通过既有每用户/指标行锁串行处理，以预期目前值检查冲突，稳定请求 ID 保证未知响应重试不重复插入。当前输入不接受空白提交，不把清空输入等同删除历史记录。

测量队列按用户与标签页独立持久化；失败保留输入，恢复网络/聚焦/手动重试恢复；不同窗口的未提交输入需要核对。乐观数据与服务器确认基准分离。修复了旧请求重试响应晚于新版本时可能回退界面的边界，目标与测量均以更新的确认值为准。

## 实际验收

- 用户亲自填写两项目前值；真实服务记录两次 `POST /api/body 200`，约6.3秒和618ms。未由代理猜测或制造当前测量值。
- 刷新后六项字段逐项比较全部相同；体重与体脂切换后，百分比按各自的真实目前值计算，进度条同步变化。
- Escape关闭后焦点为「数据」，卡片内输入数量为0。展开时输入数量为6。
- 1536px：卡片约487×208，弹层360×117；1024px：卡片316×157，弹层299×117；430px：卡片388×148，弹层360×117。均不超过卡片尺寸，无内部横向或纵向溢出。证据在 Git 忽略的 `test-results/body-goals/popover-layouts.json` 与截图中。
- Lint、类型检查、57项测试及生产构建通过。包含真实 SQL 引擎的测量写入/幂等/字段分离/冲突/RLS，以及测量队列的防抖、失败恢复、刷新重试、旧响应保护测试。
- HTTP smoke 检查新增测量 POST 未登录返回401。没有重新实测系统级断网或两台实体设备同时修改；这些没有被表述为通过。

## 文件

新增：`src/components/ui/popover.tsx`、`popover.module.css`、`src/lib/measurement-editor.ts`、`tests/measurement-editor.test.ts`、`supabase/migrations/202610160003_body_measurement_write.sql`、本报告。

修改：`src/components/dashboard/BodyGoalCard.tsx`、`BodyGoalCard.module.css`、`src/lib/body-goals.ts`、`goal-editor.ts`、`src/app/api/body/route.ts`、`tests/body-goals.test.ts`、`supabase/setup.sql`、`scripts/smoke.mjs`、`THIRD_PARTY_NOTICES.md`。未新增运行依赖。
