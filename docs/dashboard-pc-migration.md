# kuizFit 单一 Dashboard 清理记录

本记录替代上一阶段保留窄屏旧 UI 的决定。当前只保留深色 Dashboard；不开发第二套移动端页面。

## 根因与恢复点

旧 Dashboard.tsx 使用 `(min-width: 961px)` 的 matchMedia/useSyncExternalStore 分支，在窄窗口挂载 LegacyDashboard。同时新版 CSS 完整包在相同的 min-width Media Query 内，单独移除组件分支仍会让窄窗口失去新版样式。

修改前已创建本地 Git 快照 `2e3e549`（Snapshot Dashboard before removing legacy fallback）。该快照包含上一阶段未提交的文件；未推送远程。

## 唯一入口与布局

`/dashboard` → `src/app/(private)/dashboard/page.tsx` → `Dashboard.tsx` → `DashboardWorkspace.tsx`。

Dashboard 只调用原有 useDashboardData 并渲染一个 Workspace，无窗口判断、备用分支或隐藏的旧页面。`/journal` 仍是保留合法日期的重定向入口，不承载第二套 UI。

保留原有 12 列深色网格：01 占左侧 6 列、前两行；02 训练计划/物品 Tabs 与 03 紧凑月历位于第一行右侧；05 位于第二行右侧；06/07/08 各占第三行 4 列。没有重做视觉系统或生成图表数据。

PC 工作区内容最小宽度 976px，加两侧 24px 留白对应 1024px 浏览器。更窄窗口横向查看同一工作区；没有新手机断点或卡片重排。共享导航的其他页面样式保持原行为，Dashboard 自身使用同一套 PC 导航位置。

## 文件与代码清理

修改：

- `src/components/Dashboard.tsx`：删除 LegacyDashboard 完整布局、旧卡片、宽度订阅与切换逻辑。
- `src/components/dashboard/Dashboard.module.css`：移除 961px 样式限制；新版主题、网格、顶部导航在所有宽度使用；日历使用局部类名，避免依赖旧全局展示样式。加载播报不再挤占紧凑月历的日期空间。
- `src/components/Checkins.tsx`：删除只被旧 Dashboard 使用的 compact 卡片分支。保留 toolbar、排行榜、偏好设置和全部请求处理。
- `src/app/globals.css`：删除旧 dashboard-board、彩色 daily-training、daily-checkin、reserved-card、大日历及专属断点规则，清理其未使用变量。保留其他页面共用的 module、训练、签到、三餐与导航样式。
- `docs/dashboard-pc-migration.md`：更新为当前单一实现的交付记录。

重命名/迁移：

- `src/components/dashboard/DesktopDashboard.tsx` → `DashboardWorkspace.tsx`：去除宽度版本命名，原有正确界面与入口保留。
- 删除 `src/components/TrainingCalendar.tsx`；其日期选择/切换处理迁入 `src/components/dashboard/TrainingMonthCalendar.tsx`，只使用新版紧凑月历样式，不再引用旧大型彩色日历类名。

没有新增依赖。Radix Tabs 仍被实际使用。没有删除 API、Service、数据模型或业务 Hook。

## 保留的业务能力

- useDashboardData：资料/时区、所选日期、月训练查询、三餐查询、焦点刷新和保存/导入后的刷新通知。
- calendar.ts：月格计算、年月切换的月底修正、力量/有氧分类标记。无改动。
- DeletedRecords：已删除记录查询及带 revision 的恢复 API。
- Checkins 与 checkins API/服务：签到、连续天数、排行榜与上榜偏好。
- MealsCard/Meals 与 meals/photos API：三餐切换、备注、上传及已有照片操作。仍通过新版三餐弹窗访问。
- SessionEditor、Training、训练记录 API、导入导出及全部用户关联逻辑保持原实现。
- Supabase 配置、认证、数据库结构、RLS、真实用户数据均未修改。

## 验收

在已登录的本地浏览器逐个设置视口并截图：

| 视口     | 唯一新版 / 旧节点数 | 布局结果                             |
| -------- | ------------------- | ------------------------------------ |
| 1536×900 | 是 / 0              | 7 张卡片，无重叠、页面或卡片溢出     |
| 1280×720 | 是 / 0              | 7 张卡片，无重叠、页面或卡片溢出     |
| 1024×768 | 是 / 0              | 7 张卡片，七列月历无横向溢出，无重叠 |
| 768×871  | 是 / 0              | 同一 PC 网格，允许横向查看，不回退   |
| 430×871  | 是 / 0              | 同一 PC 网格，允许横向查看，不回退   |

缩放过程中物品清单 Tab 的选中状态保持，没有因切换组件而重置。每次均只有一个 Dashboard 标题/工作区。源码搜索未发现 LegacyDashboard、DesktopDashboard、dashboard-board、daily-training、daily-checkin、reserved-card、旧 TrainingCalendar 或 960/961px 回退规则的引用。

实际交互：切换 Tabs；选择 2026-10-14 后新增记录链接和三餐弹窗日期同步；2024-02-29 切到 2025 年时正确修正为 02-28；今天按钮恢复当前日期。已登录账号的真实连续签到显示 1 天；没有向账户写入测试数据。训练页面导航仍正常，离开 Dashboard 后恢复原白色背景。

类型检查、ESLint、35 项现有测试（含本地 PostgreSQL 引擎的 RLS/事务测试）、生产构建和本地 HTTP smoke 通过。HTTP smoke 确认未登录业务路由重定向、受保护 API 拒绝访问。未改登录/注册文件；未改数据 Hook、领域计算、API 或数据库文件。

本地截图及尺寸/节点记录位于 `test-results/dashboard-single/`（忽略的验证产物），含 1536.png、1280.png、1024.png、768.png、430.png 和 layout-checks.json。

## 尚未接入 / 未验证

训练/休息计时、力竭分析、训练轮换推进、物品配置与每日勾选、身体目标、力量趋势、肌群分析、周负荷仍待后续业务开发，当前如实展示未接入状态。没有假曲线或无效操作按钮。

本次没有提交新的训练、饮食、图片或签到写入；真实写入、恢复等端到端流程未重复测试。没有进行移动端设计或正式部署。
