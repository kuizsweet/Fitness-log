# Trophy 排行榜接入

2026-10-16。基于 Trophy `Leaderboard Rankings` 的公开源码适配，完整 MIT 许可见根目录 `THIRD_PARTY_NOTICES.md`。

- 文档：https://ui.trophy.so/docs/components/leaderboard-rankings
- 实际读取的源码：https://ui.trophy.so/r/leaderboard-rankings.json

## 适配范围

保留原组件的排名行、前三名皇冠、头像后备与本人高亮，样式适配为项目现有 CSS Modules。没有执行 shadcn 全局主题初始化。仅新增原组件使用的 `lucide-react@1.57.0`。

- 数值显示改为精确签到天数，例如 `1200天`，不缩写 k/m。
- 昵称下保留空白等级行，不填等级或说明文字。
- 每页固定 10 人，删除页大小选择，分页位于底部正中。
- 排行榜占满导航下方内容区，10 行随可用高度排列，无页面外层滚动条。
- 保留刷新、加载、错误、空榜和分页禁用状态。
- 原两栏表格展示已删除，排行榜不再渲染签到和上榜设置。
- 签到 API、记录与现有 Dashboard 签到调用保留，未新增签到卡片。
- 上榜设置表单和保存逻辑保留在 `CheckinPreferences.tsx`，暂未挂载到设置页。移除了旧 `/leaderboard#visibility` 入口。
- 沿用真实 `checkins` 接口、服务端名次及并列排名，不改数据库、认证、RLS 或生产配置。
- 接口没有头像或账号 ID，因此使用昵称首字占位。`entry-*` 仅为前端列表键，不作为账户 ID 或接口参数。

## 文件

新增：`src/components/ui/leaderboard-rankings.tsx`、`src/components/CheckinPreferences.tsx`、`src/components/CheckinPreferences.module.css`、`tests/leaderboard.test.ts`、`THIRD_PARTY_NOTICES.md`、本文档。

修改：`src/components/Checkins.tsx`、`src/components/Leaderboard.module.css`、`src/components/AppShell.module.css`（仅 checkin 区域）、`src/components/Settings.tsx`（删除失效入口）、`src/components/dashboard/DashboardWorkspace.tsx`（入口文字）、`src/lib/checkins.ts`（数据适配与通用分页）、`package.json`、`package-lock.json`。

## 验证

- 41 项测试、TypeScript、ESLint 通过。
- 正式生产构建与本地 HTTP 访问控制 smoke 通过。
- 本地已登录网页读取真实接口，目前为空榜；右栏为 0，底部分页居中。
- 1536×900：实际应用 body、main 无溢出，分页中心与视口中心一致。
- 独立测试页加载同一组件和样式，明确标记“隔离组件验证 · 测试数据”，验证 23 行按 10/10/3 分页、末页按钮禁用、本人高亮、三个皇冠、等级留白及 `1200天`。
- 1024×600：10 行无单行或页面外层溢出，分页中心误差小于 1px。
- 测试页与截图在忽略目录 `test-results/trophy-leaderboard/`，不进入正式应用路由、不调用 API、不连接 Supabase。
- 未在线写入用户偏好或测试训练数据；真实多人数据尚未在线验证。

没有接入 Trophy 云服务或付费 shadcn.io 区块。未修改登录、注册或训练业务。
