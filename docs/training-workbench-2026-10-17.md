# 训练计划工作台骨架（2026-10-17）

## 范围
/train 保留原路由，旧 Training 的纵向列表与 Catalog 拼接布局退出；由 TrainingWorkbench 单一实现替代。未修改 Dashboard、认证、数据库或 RLS。

五区：左上六行固定月历（2020–2030）；左下便签仓库及已有计划入口；中央可拖拽/缩放/置顶便签画布；右侧动作搜索及一级肌群、二级真实标签筛选；底部所选便签的已填写组数占比。

## 已接入与交互
- 复用 useResource、共享缓存与真实 catalog / planned / active 查询；动作库合并个人动作与项目原有预设，预设明确标识，未制造训练数据。
- 动作通过现有 dnd-kit 拖入便签/空画布生成动作项，也可点击加号；仅编辑组数/次数/kg重量。默认不填写虚构数值。
- 便签从标题手柄移动；右下角缩放支持指针和键盘方向键；置顶、选中和层级可操作。
- 仓库拖到日期安排，也有“安排到所选日期”按钮；日期可查看/移除本地安排。
- 现有计划仍可打开原详情；可复制为本地便签，不修改源计划。混合次数不推断为统一次数，重量不推断；原始逐组数据始终保留在源记录中。
- 已有进行中训练保留继续入口；动作/器材 CRUD 继续由 /catalog 提供。

## 本阶段边界
便签、位置、参数与安排按账号写入 localStorage，刷新恢复；失败不更新界面，显示可见错误。不跨设备同步，不写入 Supabase 训练表，不推进训练轮换，不把本地排期伪装成正式计划。后续可将草稿对接已有训练写入服务，须再处理逐组参数、重量规则、排期冲突及版本同步。

当前动作模型仅有 muscle_group 字符串；二级筛选显示实际标签，只有宽泛肌群的动作归为“未细分”。不从名称猜测上胸等解剖分类。环图按填写的组数汇总，未填写时空状态，不表示训练质量/均衡程度。

## 文件
- 修改 src/components/Training.tsx：单一工作台入口。
- 修改 src/components/Training.module.css：清理仅旧页面使用的 configuration/listRow；保留 SessionEditor、ExerciseEditor、ExercisePicker 使用的共享样式。
- 新增 src/components/workbench/TrainingWorkbench.tsx、TrainingWorkbench.module.css：五区布局与交互；页面容器样式仅命中包含本工作台的 main。
- 新增 src/lib/training-workbench.ts：草稿模型、已有计划转换、读取校验、肌群组数汇总。
- 新增 tests/training-workbench.test.ts。
- 无新增依赖。

## 验证
- 浏览器实际验证：新建、重命名、动作拖入、参数编辑、环图联动、标题拖动、右下角缩放、置顶、仓库拖到日期、筛选搜索、刷新恢复均通过。
- 1536×864 和1024×768实际截图检查五区布局；1024下中央宽489px，右侧动作库未越出窗口。画布及长列表允许内部滚动；未设计完整手机工作台。
- 类型检查、Lint、73项测试通过；webpack生产构建通过。
- 未执行真实硬件触屏验收；未新增完整业务发布、自动轮换、跨设备同步或逐组训练编辑。
- test-results/training-workbench/pc-1536.png 是带临时验收便签的画面。验收便签及其本地安排已清除；产品未植入演示便签或训练数据。

## 参考
- https://github.com/lnkiai/m3e-canvas ：侧面板/中央画布的工作台结构。
- https://mikews93.github.io/sticky-notes/ 及 https://github.com/mikews93/sticky-notes ：便签移动、右下角缩放、层级和本地恢复。演示地址本次访问超时，已核对其仓库README。
- 两者作为交互参考，本次独立实现，未复制应用源码、未安装其运行时，未引入演示项目的模拟API。

## 标题栏精简（同日）
- 删除工作台顶部 toolbar（标题/本地草稿/进行中/管理链接）；将新建按钮移到画布上沿，替换重复的已选便签名称。
- 删除已有计划折叠展示及其当前页面查询，保留原数据库、模型与API；本地仓库内容不变。
- 标题栏作为拖动激活区，移除六点按钮；名称输入框限制140px，输入与按钮不启动拖动。保留标题栏键盘操作。
- 原右下角是尺寸调整，不是全屏；将放大图标换为斜纹角标，保留用户之前要求的便签缩放。
- 实际浏览器验证标题栏空白拖动与输入框编辑不冲突；恢复了用户便签原来的位置，名称、内容及勾选参数未更改。
- Lint、类型检查及生产构建通过。截图 test-results/training-workbench/trimmed-header.png。

## 拖动重影、命名保存与 Free Exercise DB
- 画布便签取消重复的标题 DragOverlay，仅本体跟随移动；动作和仓库拖动仍保留浮层。为 DndContext 设置 React useId，消除 SSR 描述ID不一致的 hydration 警告。
- 新便签 title 为空，以灰色“未命名计划”作 placeholder，聚焦隐藏占位文字。temporary 新便签未命名时只在内存，命名后保存；仓库也仅接纳已命名新便签。序列化过滤无效排期引用。旧版已保存的未命名便签不自动删除。
- 移除右侧“动作库＋”标题行、日历说明及重复日期；今天按钮上移。一级肌群增加自定义；内联表单复用真实 catalog API，未用测试动作提交数据库。
- 固定引入 Free Exercise DB 876条记录的轻量字段快照，源提交 f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5；许可 Unlicense，保留原文 docs/free-exercise-db-LICENSE.md。
- 新增 src/data/free-exercise-db.json、free-exercise-db-source.json、src/lib/exercise-base.ts、src/app/api/exercise-base/route.ts、tests/exercise-base.test.ts；更新本地草稿模型及测试。
- 基础库由同源接口提供，不在运行时依赖GitHub。保留原始英文动作名，按原始主肌群翻译筛选标签；未推测动作名称。拖入后保留 sourceId 以便后续关联。列表分批显示60条，搜索覆盖全部记录。
- 实际浏览器验证：基础库 bench 搜索、肌群筛选、自定义输入入口、基础动作拖入便签、拖动中单一标题、未命名刷新消失、命名刷新恢复及 placeholder 聚焦透明均通过。未新建真实自定义测试动作。
- 75项测试通过，类型检查、Lint、webpack生产构建通过。命名存储验收便签已清除，用户原有便签保留。
- 验收截图：test-results/training-workbench/drag-without-duplicate.png、free-db-integrated.png。截图内为临时验收便签，代码未植入演示数据。
- 数据来源：https://github.com/yuhonas/free-exercise-db

## 中文动作与胸部细分
- 876 条基础动作使用本地中文名称表，保留稳定来源 ID 与英文搜索；不修改用户自定义动作或历史训练。
- 工作台移除额外旧预设合并，基础库与个人动作保留。已有基础动作便签按来源 ID 显示中文。
- 胸部二级顺序为上胸、中胸、下胸、未细分；俯卧撑与斜板卧推方向分别处理。标签表示训练侧重，未明确方向的动作不强行归类。
- 77 项测试、Lint、类型检查、webpack 生产构建通过；浏览器已检查中文列表及胸部二级筛选。
