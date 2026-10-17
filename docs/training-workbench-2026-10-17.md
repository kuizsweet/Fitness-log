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

## 胸部分类审查与画布内占比卡
- 核对固定版本原始 exercises.json 中全部84个胸部动作的 instructions/category，逐ID保存分类及判定理由：src/data/exercise-chest-regions.json。14上胸、40中胸、15下胸、10综合、5拉伸。分类为按动作方向推断的训练侧重，不是逐动作肌电实测结论。
- 对上拉和爆发推掷保留“综合”，拉伸单列；不为了消除“未细分”捏造单束激活优势。原始数据来源：https://github.com/yuhonas/free-exercise-db/tree/f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5 。
- 参考方向性证据：https://pubmed.ncbi.nlm.nih.gov/34644424/ 及 https://pmc.ncbi.nlm.nih.gov/articles/PMC7579505/ 。研究说明角度影响侧重，不支持把计划组数当成肌肉激活百分比。
- 底部横条移除；178×178方卡进入画布左下角，左右栏延伸到底。画布下部保留控件区域，便签拖动/滚动区不盖住占比卡。
- 当前便签按来源ID重新归类，胸部组数为分母，非胸和拉伸不计入；综合及个人未细分仍单列，不丢失组数。没有数据时保持空环。
- 浏览器实测临时未命名便签：中胸6组、上胸3组 -> 中胸67%、上胸33%。临时测试便签随刷新移除，不写数据库。

## 浮动肌群实心饼图与滚动边界修正
- 删除旧圆环及 canvasSurface 底部预留空间。图表为同一张完整画布的 absolute 浮层，不另建画布或占用布局行。
- 新增 MuscleComposition.tsx/.module.css。默认126×142，展开320×270；宽高300ms ease-in-out，标签延迟淡入/先行淡出。展开寻找不与便签相交的空位，便签始终在上层；拖动便签时收起。没有足够空位时保持便签优先，不遮挡编辑内容。
- 使用官方 shadcn/ui Chart 源码和 Recharts 实心 Pie，固定内径0、克制蓝色、原生300ms数据动画。Chart/Pie不因展开或数据修改设置新key、不重新挂载；固定细分槽位保留归零扇区过渡。减少动画设置通过 matchMedia 实时响应。
- 现有项目没有Recharts，新增该依赖及官方 chart.tsx；官方来源 https://ui.shadcn.com/r/styles/new-york-v4/chart.json ，许可原文 docs/shadcn-chart-LICENSE.md。
- planMuscleDistribution复用当前便签 exercises，由useMemo按数组引用缓存；每个动作仅计一次，肌群各自分母，胸部沿用明确源分类，其他肌群沿用已有标签；只有整肌群时归未细分，不捏造区域权重。无组数不计入，胸部拉伸排除。没有修改动作库结构或Supabase。
- 原滚动根因：底部预留缩短画布，拖动只限制顶部。fitNoteToCanvas限制完整便签，ResizeObserver处理窗口变化；拖动restrictToParentElement，鼠标/键盘缩放限制边界。画布overflow hidden无滚动，动作库等必要列表4px按hover显示，无箭头。
- 实测：原520×726画布与scrollWidth/scrollHeight完全相同；右下角拖动、键盘缩放后完整便签仍在边界内。滚动条伪元素width4px/button display none。
- 实测：上胸3/中胸6显示33%/67%；加入背部5组后独立100%；删除上胸后中胸100%；切换新空便签为空；返回编辑原便签即时恢复；展开避让后与便签矩形无相交。展开/收起始终仅一个Chart。
- 81项测试、Lint、类型检查、webpack生产构建通过。临时未命名验收便签已通过刷新清除；未写入数据库。截图 test-results/training-workbench/pie-expanded.png 与 pie-compact.png 含临时验收值。

## 去除饼图容器与扇区内标注
- 去掉黑色底板、边框、标题、加减号、外部说明及列表，仅保留圆形点击区（pointer，键盘Enter/Space，读屏说明）。肌群跟随动作库选择或当前计划首个有效肌群。
- 修复先放大后变小：旧展开布局把图表占比改成46%，ResponsiveContainer随之二次缩窄。新图表固定300×300，整体从1/3缩放到1，几何尺寸不随展开重新计算；同一Chart/Pie保持挂载。
- 展开后名称/组数/百分比三行直接标注在各扇区内，收起先淡出所有标签；中性空状态无可见文字。
- 实际浏览器测到过渡中约192px，结束后外框与图表均稳定300px；收起100px，无外部标题、背景透明、cursor pointer。81项测试通过，临时未命名便签刷新清除。

## 便签动作排序与八方向缩放
- 便签内复用已安装Dice UI Sortable组件，稳定动作ID，仅左侧GripVertical手柄启动，鼠标/触控传感器和键盘排序复用现有实现。顺序通过原onChange写入同一便签数组，组数次数重量随动作保留，不另设数据源。
- 删除便签底部动作数/来源提示与右下角斜线按钮；四边四角用透明边缘热区缩放，鼠标对应ns/ew/nwse/nesw光标，支持键盘箭头。resizeNoteFromEdge保持对边固定，最小尺寸/最大尺寸/画布边界约束保持。
- 饼图展开尺寸由300缩为220px，收起100px；仍是同一300px逻辑画布整体缩放，扇区标签保留。
- 浏览器实测鼠标排序、键盘Space/方向键/Space排序、无图标右下角缩放；临时已命名便签刷新后动作顺序和384×330尺寸保持。8边热区均具有对应缩放光标，饼图展开实际220px；临时便签已删除并刷新确认0张。
- 新增八方向几何/最小值/边界与对边固定测试，82项测试及Lint/类型检查通过。截图test-results/training-workbench/note-sort-resize.png含明确标注临时验收便签。

## 肩部细分、取消选择即全部与便签仓库往返
- 肩部129条基础动作按源说明/动作方向设置前束、中束、后束；复合、肩袖旋转、拉伸分别保留综合/肩袖/拉伸，不编造孤立优势。新本地映射src/data/exercise-shoulder-regions.json，沿用来源ID、中文和英文搜索，旧源便签展示及饼图同步归类。
- 侧重参考ACE肩部研究：https://www.acefitness.org/continuing-education/prosource/research-special-issue-2015/5320/dynamite-delts-ace-research-identifies-top-shoulder-exercises/ 。这些分类为训练方向标签，不是激活比例。
- 一级二级均移除全部按钮；已选项再次点击取消，无选中即该层全部。切换一级清除二级，避免隐藏筛选残留。肩部二级排序前/中/后。
- 移除画布右上便签数量、仓库标题右侧数量。新建便签按当前画布中心放置。
- PlanNote增加本地可选inWarehouse；仓库成为真实drop目标。便签拖出画布收起进仓库，拖回画布/点击可继续编辑；同一ID/动作数组/顺序和日期安排保留。命名便签持久化该状态；新未命名仍只在内存。增加“可拖回画布继续编辑”提示。
- 取消原父区域拖动约束，改为DragOverlay显示有背景和边框的预览，原件拖动时隐藏；结束后仍限制落在画布的便签几何边界。动作预览包含手柄、名称、肌群/来源。原悬空文字根因是DragOverlay位于.workbench之外，原祖先限定CSS不匹配；现改独立CSS模块类。
- 实测前束筛选43条，再点前束取消后显示肩部全列表。新便签在520×726画布位置90/218居中。命名临时便签拖入仓库→刷新→拖回画布，动作保留；预览背景rgb(17,17,17)且有边框。测试便签已删除并刷新清理。
- 84项测试、Lint、类型检查通过。验收截图test-results/training-workbench/shoulder-warehouse-final.png与shoulder-warehouse-preview.png含临时验收便签。

## 仓库按钮、器材筛选与显式入库保存
- 移除画布顶部新建栏及分隔；唯一新建便签按钮置于仓库标题右侧，保留边框。便签标题左侧恢复六点提示，整个标题栏原拖动规则不变。
- 搜索框缩短，focus-within由外框统一显示焦点，内部input不再独立outline；右侧Lucide Funnel官方图标，肌群/器材过滤生效时填充。来源 https://lucide.dev/icons/funnel ，复用现有依赖，无新增素材包。
- 复用Base Popover原地弹出器材标签，多选OR、再次点击取消。通过基础库equipment原始值匹配哑铃/杠铃/绳索器械/壶铃/弹力带/固定器械/自重/曲杆杠铃/药球/健身球/泡沫轴/其他/未标注。自定义未记录器材不猜测，归未标注。器材与肌群/细分/搜索AND组合。
- Popover挂载工作台内，继承蓝色设计变量，避免全局绿色变量；选中态覆盖普通hover。没有改数据库结构或其他页面。
- savedToWarehouse为显式本地保存标记，新草稿默认false；命名只更新画布内存，不同步仓库、不持久化。首次拖入仓库设置true后才保存；取回编辑仍保留true并保存同一记录。旧持久数据缺标记时兼容保留。日期持久化引用过滤仍有效。
- 仓库条目及便签拖动预览从源条目测量尺寸，实测宽197.33px/高48.125px完全一致，去掉大尺寸空仓库创建按钮及重复新建入口。
- 实测：哑铃+卧推只显示对应哑铃动作；漏斗fill currentColor，选中标签RGB168/197/239。搜索外框32px/输入内容30.67px，焦点只在外框；新命名便签仓库0条→刷新0张，首次拖入后仓库1条且刷新保留；已清除测试便签。截图test-results/training-workbench/equipment-filter-save.png。
- 86项测试、Lint、类型检查和webpack生产构建通过。

## 筛选弹层对齐、有氧与仓库关闭语义
- 根因：Popover Portal的普通流包装节点成为workbench的第二个flex子项，触发12px gap，导致工作区开关时缩放。改用绝对定位portal宿主，保留主题继承，Positioner以整条搜索行作为固定定位锚点；弹层宽度使用--anchor-width、圆角6px，与胸/手臂外侧边缘及顶部对齐。
- 浏览器实测弹层开关前后workspace均767.333px高；弹层左右820.667/1041.333px，和肌群按钮组边界一致，顶部146.667px一致。
- 原自定义一级改为有氧；其他顶部显示自定义创建表单，其他列表包含个人动作。保留再次点击取消选择即全部的规则。
- 有氧读取源库category=cardio的14条真实记录，以稳定来源ID细分跑步机、椭圆机、爬楼机、固定/卧式单车、划船机等；保留原始equipment及muscle字段，无数据库迁移。二级椭圆机实测仅显示椭圆机训练。坡度走沿用跑步机记录，不编造独立坡度机或专用动感单车数据。器材名称参考 https://www.lifefitness.com/en-us/cardio 和 https://www.lifefitness.com/en-us/catalog/cardio/bikes-indoor-cycles 。
- closeWorkbenchNote仅关闭已保存便签并收回仓库，保留ID、参数和日期引用；未保存草稿关闭才丢弃。deleteWorkbenchNote供仓库×使用，明确删除便签及其日期引用。仓库原安排+改为删除×，日历拖入安排保留。
- 浏览器实测临时便签：入库→拖回画布→关闭→刷新，仓库仍存在；仓库×仅清理测试项，用户原有未命名便签保留。截图test-results/training-workbench/cardio-warehouse-fix.png与equipment-aligned.png。
- 新增关闭/删除语义及真实有氧映射测试，88项测试、Lint与类型检查通过。

## 仓库整行拖动与日历选择
- 仓库名称、动作统计与六点整合为同一个拖动按钮，删除×保持独立。移除仓库提示文字及动作库所有添加+入口，保留鼠标/触屏/键盘拖动。
- 年份与新增月份原生选择框指定dark color-scheme及option深色背景，避免系统白底。实测选择11月后首日为2026-11-01，再恢复10月。
- 漏斗填充仅依据equipment筛选，一级/二级肌群不再触发填充。浏览器验证核心选中时fill=none，动作添加+为0、提示文字不存在。
- 从仓库文字中部拖到画布实测可用，验收后已收回，保留原有仓库便签与用户画布草稿。Lint和类型检查通过，截图test-results/training-workbench/whole-row-month-filter.png。

## 垃圾桶删除、互斥移动与复制
- 最新交互覆盖此前双处显示规则：仓库只渲染inWarehouse=true的便签，画布只渲染其余便签。移动保留同一ID、动作和保存标记，首次入库后取回画布继续持久化。
- 移除便签关闭×、仓库删除×；仓库右侧Copy复制至原条目下一项，便签及所有动作生成独立ID，不复制日期引用，沿用总数30上限。
- 画布底部中心常驻低强调垃圾桶，仅便签拖动时亮起，接触放大1.2倍并红色高亮，松手调用统一删除与日期引用清理。动作拖动不激活垃圾桶。垃圾桶固定注册，碰撞优先于画布；减少动态启用带来的测量遗漏。
- 已实测鼠标仓库直接拖入删除、键盘Space/方向键/Space删除；碰撞高亮截图trash-highlight.png。验收计划入库/取回各只显示一处，副本在原项下方；已清理两张临时测试便签，用户胸三头日保留。
- 89项测试、Lint与类型检查通过；新增复制顺序、独立ID、日期引用及数量上限测试。

## 标题、自适应输入与动作拖回
- 标题居中，移除标题六点；使用field-sizing:content让输入随内容增减。实测2字32px、4字56px、9字116px。黑色空白区加入便签拖动，输入和动作行排除；动作末尾×及空网格列移除。
- 便签/仓库预览均去掉六点，标题居中；根DndContext复用snapCenterToCursor，使缩小后的预览以鼠标位置为中心，碰撞计算与预览保持一致，键盘拖动保留。
- 便签内Sortable保留原数据源与排序；取消仅纵向位移限制，增加同一排序上下文内的动作库投放目标（portal覆盖现有右侧库区域）。拖回只移除便签动作，不删除基础/个人动作库。SortableOverlay避免出框裁切，动作库碰撞高亮。
- Sortable对非列表投放目标增加索引边界校验，避免overIndex=-1导致额外arrayMove覆盖移除结果。
- 浏览器临时计划实测基础动作添加→拖回右侧→便签动作为空，原胸三头日两项动作与参数保留；拖动标题预览svg数量0、text-align=center。临时便签已清理。截图centered-drag-label.png。
- 89项测试、Lint和类型检查通过。

## 配置路由与年月按钮统一
- Dashboard年月去掉年/月文字，年份与月份保留原生深色选择能力并显示按钮边框；今天居中，原底部入口移除。两个日历select均appearance:none隐藏下箭头。
- 配置日历同样使用数字年份/今天/数字月份，移除原日历下方今天行，让仓库上移。实测月份11对应2026-11-01，今天回到2026/10。
- 正式页面从/private/train转到/private/config；导航、训练编辑器返回配置、catalog跳转更新至/config。旧/train使用Next redirect跳到/config，保留经过校验的date参数。未修改本地保存键，原计划保留。
- 浏览器/config加载后深色边框与appearance:none确认，胸三头日仍在；截图config-calendar-final.png。

## 配置工作台间距和连续圆角
- 去掉canvas[data-over]的整圈outline，拖起便签不再高亮整个画布；保留垃圾桶与实际落点提示。
- 工作台主列间距统一16px，左右面板内边距16px，仓库条目间距8px；主面板16px、便签14px、预览12px圆角。浏览器支持corner-shape:squircle时启用连续圆角，其他浏览器沿用border-radius，未引入额外库。
- 浏览器CSS.supports返回true，主面板计算corner-shape为superellipse(2)，列间距16px，页面无横向溢出；原计划保留。拖动截图continuous-corners-drag.png。
