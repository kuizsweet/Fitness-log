# 物品清单验收（2026-10-17）

仅修改训练计划/物品清单卡片。移除标题、旧计划说明与链接；保留计划 Tab 的空内容，默认显示物品清单。最多 5 项、名称最多 32 字；不增加内部滚动条。

## 文件
- src/components/dashboard/DashboardWorkspace.tsx：替换卡片内部内容，移除该卡片的计划查询。
- src/components/dashboard/Dashboard.module.css：缩小右上角 Tabs，清理旧计划样式。
- src/components/dashboard/ItemsChecklist.tsx、ItemsChecklist.module.css：可独立复用的清单组件；挂在 ResourceProvider 下以取得当前账号。
- src/lib/items-checklist.ts：数据校验、稳定 ID、排序序号。
- src/components/ui/sortable.tsx：Dice UI Base 官方公开实现，适配 cn 导入，修复 KeyboardSensor 已 preventDefault 导致落位被阻断的问题及 Hook 依赖。
- src/lib/cn.ts：样式合并工具。
- package.json、package-lock.json：增加官方排序组件所需 @dnd-kit/core、modifiers、sortable、utilities，及 @base-ui/utils、clsx、tailwind-merge。
- docs/diceui-LICENSE.txt：保留 Dice UI MIT 授权。

## 状态保存
当前没有物品清单服务端接口。按账号隔离保存在当前浏览器 localStorage（kuizfit:items:v1:<userId>），刷新保留；不跨浏览器/设备同步，不新增 Supabase 表。新增/勾选/删除/落位同步原子写入；写入失败保持原清单及输入并显示错误，不存在异步响应覆盖顺序。损坏的数据不覆盖原存储。

## 验证
- 实际 localhost 浏览器：添加、勾选、鼠标多次手柄排序、键盘 Space/ArrowUp/Space 排序、删除、Tabs 切换及刷新保留均通过；勾选完成不自动移动；拖动不触发勾选。
- 满额 5 项限制通过。1024×720 卡片 clientHeight/scrollHeight 均251，宽度均232；1536×864 高度均312、宽度均360；清单无溢出。
- 生产构建 npm run build -- --webpack、Lint、类型检查通过；已有69项测试通过。测试最初因沙箱 Windows 用户信息读取 ENOMEM 失败，在沙箱外重跑通过。
- 触屏配置使用官方 TouchSensor；工具没有真实触屏手势模拟能力，未进行硬件触屏验收。存储空间耗尽错误未在浏览器注入模拟。
- test-results/items-checklist/card-verified.png 为临时测试物品截图；测试物品已清除，未在产品代码植入演示数据。

参考：https://diceui.com/docs/components/base/sortable
源码：https://github.com/sadmann7/diceui/blob/main/docs/registry/bases/base/ui/sortable.tsx
未使用 shadcn.io Pro 源码。

## 后续调整（同日）
- 添加框与 Plan / List 放在同一行，添加框自适应剩余宽度；1024×720 实测不重叠、不溢出。
- 新勾选的物品移动到底部；取消勾选不移动；手动排序优先且刷新保留，不持续按完成状态强制排序。
- 存储改为 day/items 格式，兼容旧数组。按浏览器本地日期零点清除勾选、保留顺序和物品；页面恢复焦点、从后台恢复或刷新时补做跨日检查，并监听其他标签页更新。
- 新增 tests/items-checklist.test.ts：验证置底/手动覆盖、取消勾选、同日/跨日、旧格式迁移。共71项测试通过；跨日使用可控日期的单元测试，未等候真实零点。
- 保留了用户自行添加的水杯、耳机及其原始顺序和勾选状态。

## 容量与 Plan 输入框
- 清单上限提升为10项；可用高度足够时完整展示，较矮窗口仅在放不下时分页，不增加滚动条、不裁切既有物品。
- 切到 Plan 隐藏并禁用添加表单的交互，保留右侧切换入口位置；切回 List 恢复。
- 实际添加至10项验证：常规窗口完整展示；1024×720 下分页，卡片 clientHeight/scrollHeight 均251、宽度均232。临时验收项目已删除，用户原有5项保留。
- 类型检查、Lint及71项测试通过。

## 最近完成置顶与动效
- 取消跨完成状态的手动排序例外：未完成在前、已完成在后，手动调整仅保留组内相对顺序。
- 新勾选项目插入已完成分组第一位，不再移动到全清单末尾；取消勾选回到未完成分组末尾。
- 使用原生 WAAPI FLIP 实现180ms移位，快速操作从当前可见位置衔接，减少动态效果时跳过动画；未增加动画依赖。
- 浏览器实测护腕从第二位移到已有完成项外套上方，未到底部；完成后恢复了用户原有顺序及勾选。
- 更新排序用例，71项测试、类型检查及Lint通过。
