---
name: kuizfit Fitness Console
description: 白色页面承载深色控制台卡片，以训练日历和真实记录组织当天任务。
colors:
  ink: "#172027"
  muted: "#52606a"
  line: "#d9e0e4"
  accent: "#176b4c"
  dark-ink: "#f3f5f7"
  dark-muted: "#aeb7c0"
  dark-line: "#384148"
  dark-accent: "#bae6a5"
  surface: "#20262b"
  field: "#141a1f"
  page-bg: "#ffffff"
  training-ink: "#ffd3a6"
  training-bg: "#292722"
  meals-ink: "#98dfcf"
  meals-bg: "#202b2b"
  lunch-ink: "#b9d7fb"
  lunch-bg: "#242b34"
  dinner-ink: "#ecc8a9"
  dinner-bg: "#302925"
  checkin-ink: "#cbb3fc"
  checkin-bg: "#272630"
  hero-start: "#f6b98e"
  hero-end: "#efdaa0"
  hero-ink: "#25271f"
  hero-muted: "#525047"
  button-bg: "#30383e"
  button-hover-bg: "#3d484e"
  primary-ink: "#16211a"
  module-button-ink: "#12171a"
  focus: "#176b4c"
  dark-focus: "#a2dce4"
  glass-bg: "rgba(38, 45, 51, 0.95)"
  glass-line: "rgba(255, 255, 255, 0.12)"
  glass-fallback: "#262d33"
  navigation-selected-bg: "#eef3f4"
  navigation-selected-ink: "#172027"
  card-line: "rgba(255, 255, 255, 0.06)"
  error-ink: "#ffb4a9"
  error-bg: "#3d2424"
  notice-ink: "#b3e6c7"
  notice-bg: "#22352d"
  calendar-idle: "#737d87"
  calendar-strength: "#53a8fa"
  calendar-cardio: "#74d995"
  calendar-selected-bg: "#b5d8fa"
  calendar-selected-ink: "#102335"
  calendar-selected-strength: "#1674c9"
  calendar-selected-cardio: "#178943"
  calendar-today-line: "#779bb8"
  calendar-hover-bg: "#303b44"
  training-heading: "#944320"
  catalog-heading: "#70429d"
typography:
  headline:
    fontSize: "clamp(1.8rem, 3vw, 2.35rem)"
    fontWeight: 650
  title:
    fontSize: "1.3rem"
    fontWeight: 650
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif'
    fontSize: "16px"
    lineHeight: 1.6
  label:
    fontSize: "0.9rem"
  streak:
    fontSize: "3.5rem"
    lineHeight: 1.15
rounded:
  card: "26px"
  card-mobile: "24px"
  button: "16px"
  field: "12px"
  photo-picker: "18px"
  calendar-day: "14px"
  navigation: "24px"
  navigation-item: "18px"
  account-panel: "22px"
  account-action: "12px"
spacing:
  row: "12px"
  module-gap: "16px"
  dashboard-gap-mobile: "12px"
  module-padding: "24px"
  module-padding-tablet: "20px"
  module-padding-mobile: "16px"
  dashboard-gutter: "clamp(16px, 2vw, 36px)"
components:
  button-primary:
    backgroundColor: "{colors.dark-accent}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.button}"
    padding: "9px 14px"
  button-secondary:
    backgroundColor: "{colors.button-bg}"
    textColor: "{colors.dark-ink}"
    rounded: "{rounded.button}"
    padding: "9px 14px"
  button-checkin:
    backgroundColor: "{colors.checkin-ink}"
    textColor: "{colors.module-button-ink}"
    rounded: "{rounded.button}"
    padding: "9px 14px"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.dark-ink}"
    rounded: "{rounded.field}"
    padding: "8px 10px"
  card-checkin:
    backgroundColor: "{colors.checkin-bg}"
    textColor: "{colors.dark-ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.module-padding}"
  card-training:
    textColor: "{colors.hero-ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.module-padding}"
  photo-picker:
    textColor: "{colors.meals-ink}"
    rounded: "{rounded.photo-picker}"
    padding: "16px"
  navigation:
    backgroundColor: "{colors.glass-bg}"
    textColor: "{colors.dark-muted}"
    rounded: "{rounded.navigation}"
    padding: "5px"
  account-trigger:
    backgroundColor: "{colors.glass-bg}"
    textColor: "{colors.dark-ink}"
    rounded: "{rounded.navigation-item}"
    size: "48px"
  training-calendar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.dark-ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.module-padding}"
  meal-tabs:
    rounded: "{rounded.button}"
    padding: "4px"
  reserved-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "{spacing.module-padding}"
---

# Design System: kuizfit Fitness Console

## Overview

当前控制台以训练日历作为日期入口：大日历先建立月份与所选日期，再联动当天训练与三餐。纯白页面与不透明白色粘性头部承载深色日历、浅桃黄训练卡、紫色签到卡、合并三餐卡和刻意留白的保留位置。页面没有额外标题或标语；顶部“控制台”导航承担当前页面识别。

这是可调整的视觉初版。保留卡片没有内容，也不是服务器加载状态；未来用途仍由用户决定。现有实现不增加虚构指标、热量、图表或完成率。本文件提取自 globals.css、Dashboard.tsx、TrainingCalendar.tsx、MealsCard.tsx、Meals.tsx、Checkins.tsx 与 AppNavigation.tsx。已核对 .impeccable/review/white-console-desktop.png 与 white-console-mobile.png，原有卡片几何与当前源码一致。

**Key Characteristics:**
- 大训练日历直接选择日期，无独立日期工具栏。
- 灰、蓝、绿点表达无分类、力量、有氧；混合日保留两个分类点。
- 三餐合并为一个有键盘操作的标签页卡片。
- 深色玻璃导航与独立个人账号入口。
- 纯白页面和不透明白色头部，卡片内保留原有深色与彩色体系。
- 刻意保留空白卡片，真实加载与留白分别表达。

## Colors

### Primary

页面默认链接使用深绿 accent。卡片、导航、账号区域和控件在各自作用域内改用浅绿 dark-accent，承担默认主按钮、真实导航待处理标记和输入光标。默认主按钮配 primary-ink，彩色卡片按钮配 module-button-ink。

### Secondary

当天训练卡使用 hero-start 到 hero-end 的桃黄渐变，配 hero-ink 与 hero-muted；其他训练区域仍保留 training-ink / training-bg。早餐使用 meals-ink / meals-bg。

### Tertiary

三餐外层统一使用 meals-ink / meals-bg；餐次编辑内部沿用早餐绿、午餐蓝、晚餐暖色的提示与上传区域。签到使用 checkin-ink / checkin-bg。日历保留 calendar-idle、calendar-strength、calendar-cardio 分类点和日期可访问名称，底部图例与时区行已移除；选中日期用浅蓝底和深字，今日另有细描边。未分类的历史记录保留灰点，灰点不代表没有训练；同日包含力量与有氧时显示两个点。独立训练和动作与器材页面标题分别使用 training-heading、catalog-heading。

### Neutral

page-bg 承担纯白页面与整个头部；ink、muted、line 承担页面深色正文、辅助文案和头部下边框。卡片、导航、账号菜单与控件使用 dark-ink、dark-muted、dark-line 的深色作用域，不能让页面深字直接落到深卡片上。surface 承担训练日历、保留空白卡和通用容器，field 承担字段底色。导航与账号层使用 glass-bg / glass-line，选中导航为浅底深字；不支持模糊或要求减少透明度时使用 glass-fallback。错误与保存反馈保持深色底和浅色文字。

## Typography

中英文均使用系统字体栈，正文行高 1.6，段落最长 75ch。控制台没有页面标题，卡片标题桌面为 title，520px 及以下为 1.1rem；其他页面标题沿用 headline。签到数字桌面为 streak，手机为 2.5rem；完整排行榜个人签到数字为 1.8rem。日期星期标题为 0.8rem，数字以排列关系建立对齐。未加载品牌字体，也未引入品牌标题。

## Layout

控制台正式入口为 `/dashboard`，旧入口仅为兼容跳转。容器没有最大宽度限制，水平边距为 dashboard-gutter；其他页面仍以 1200px 为最大宽度。没有独立页面标题、标语或日期工具栏。

800px 以上为三条等宽网格列：训练日历跨两列、当天训练占第三列；下一排是签到、合并三餐卡、保留空白卡。日历最小高度 440px，训练与签到最小高度 300px；保留位置最小高度 260px、贴齐行顶部。800px 及以下改为两列：日历占满首行，后续训练、签到、三餐与保留空白依次占四个半宽位置。

520px 及以下控制台水平边距和卡片间距均为 12px；日历取消最小高度，训练最小高度 250px，签到取消固定最小高度，保留空白最小高度 220px。日历标题独占一行，下方是年份、月份与月切换操作；7 列日期保持一致，日期单元最小高度 44px。只有当前可见餐次面板内的展开内容打开时，三餐卡临时跨两列；其他隐藏面板的状态不扩宽卡片。

顶部完整宽度的白色粘性头部以细下边框分隔内容，导航顺序为控制台、训练、动作与器材、排行榜，桌面居中、个人账号入口靠右。760px 及以下导航在其可用列内居中；520px 及以下收紧内边距和字号，360px 及以下分段内边距为 8px 6px、字号为 0.8rem。导航与通用按钮最小高度为 44px；手机月切换按钮的最小宽度为 40px。过去训练通过日历回看，已删除记录在当天训练卡内按需展开。

卡片最终数据、保留位置的用途、局部密度与色调仍可继续决定。

## Elevation & Depth

正文卡片依靠明暗、底色与轻边框组织，没有新增悬浮阴影。桃黄渐变仅用于当天训练卡。整个头部是完全不透明的白底；其中导航、账号入口与账号面板仍是高不透明度的深色玻璃功能层，模糊 20px、饱和度 150%，配轻外阴影与内高光；选中导航项有独立浅阴影。减少透明度偏好移除模糊并改为实色底，不支持模糊时也提供实色回退。没有新增装饰动效。

## Shapes

卡片桌面圆角为 26px，520px 及以下为 24px。按钮和实际餐食照片为 16px，字段为 12px，照片选择区域为 18px。导航仍为圆角矩形，桌面外框 24px、分段 18px，手机分别为 20px、15px；账号面板为 22px。卡片形状表达当前看板关系，不意味着每个内部条目都要再包一层卡片。

## Components

- **训练日历：** 年份与月份字段、上一月、下一月、今天构成直接日期入口。网格固定七列、六周位置，非本月位置留空；灰点表示无分类标记，蓝点表示力量，绿点表示有氧，混合日期有两个点。底部图例与时区行不显示，日期可访问名称保留分类说明。选中日浅蓝底，今日有细描边；加载和失败明确提示记录未载入，不以灰点暗示已完成加载。
- **当天训练卡：** 桃黄底、深字。训练记录与真实空状态位于操作上方，深色主按钮配白字，次操作使用半透明浅底。“已删除记录”按需展开。
- **签到卡：** 深紫底、浅紫标题和连续数字。控制台紧凑卡不重复日期与状态行，签到按钮直接表达“今日签到”或“今日已签到”；读取与失败提示保持真实。完整排行榜仍显示日期与签到状态，操作和入口行为不变。
- **合并三餐卡：** 标题仅为三餐记录，不重复日期或照片数量标题。早餐、午餐、晚餐是三个标签页，支持左右方向键、Home、End 与单一 Tab 入口。隐藏面板保持挂载，切换餐次保留未保存备注。仅当前面板可见；当前面板展开备注、拍照说明或恢复内容时，手机卡片跨两列。
- **照片选择：** 图标与文字空区域连接原生文件选择器，不以占位餐图伪装用户记录。有照片后选择入口缩为横向小区域；真实照片保留删除、替换与恢复操作。
- **保留空白卡：** 使用通用深色表面与圆角，刻意没有正文、图标、指标或交互，设置 aria-hidden。它是用户指定的未定位置，不表示加载失败或服务器正在响应。
- **按钮与字段：** 通用按钮深底，主按钮浅绿；字段深底浅字。键盘焦点为 3px 外框、偏移 3px：白色页面、账号入口与桃黄训练卡用深绿 focus，深卡片、导航及账号面板用浅蓝 dark-focus。照片区域仍以浅绿 focus-within 标明文件输入焦点。禁用操作降低透明度并显示等待光标。
- **导航与真实加载：** 选中页浅底深字；请求中的链接显示浅绿短线，来自实际导航 pending 状态。原生 Next 页面加载边界提供文字与静态深色占位块，只用于真实待处理状态，不展示虚构数据；它与控制台保留空白卡不同。账号菜单在切换路由、点击外部或 Escape 时关闭，Escape 返回入口焦点。
- **排名：** 默认不上榜。开启后仅展示昵称、连续天数与排名，关闭并保存后自己的签到历史仍保留。长昵称可换行，自身行增加字重并显示“你”。

## Do's and Don'ts

### Do:

- Do 保留训练日历、真实记录、分类点与日期的可访问名称。
- Do 保留手机两列关系，仅为当前展开的餐次编辑提供整行空间。
- Do 将保留空白的用途、卡片数据、密度和色调视为待决定参数。
- Do 保留可见焦点、可换行内容与足够的触控高度。

### Don't:

- Don't 添加没有真实数据来源的指标、图表、热量或完成率。
- Don't 用假餐图伪装上传记录，也不要让预览代表保存成功。
- Don't 在每个内部条目上嵌套新卡片或长期展开全部辅助操作。
- Don't 默认开启上榜，也不要在排名中展示私人训练、三餐或签到历史。


