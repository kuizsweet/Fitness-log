# 登录与注册 UI 模板适配记录

> 本文为初版适配记录，其中 compact、20px 标题、无新增依赖等描述是当时状态。后续视觉修正及当前验收结果见 [auth-visual-refinement.md](auth-visual-refinement.md)。

日期：2026-10-15。本阶段仅修改认证页面、认证专用展示组件和相关 smoke 断言；没有修改 Dashboard、其他业务页面、全局 CSS、Supabase 配置、数据库结构或用户数据。

## 模板与兼容性

- 登录：官方 [login-01](https://ui.shadcn.com/blocks/login)，核对 [注册表源码](https://ui.shadcn.com/r/styles/new-york-v4/login-01.json)。保留居中卡片、左对齐标题、邮箱/密码字段、密码旁的找回入口、主按钮和底部注册入口。
- 注册：官方 [signup-03](https://ui.shadcn.com/blocks/signup)，核对 [注册表源码](https://ui.shadcn.com/r/styles/new-york-v4/signup-03.json)。保留浅灰背景、顶部品牌、白色居中卡片、居中标题、字段组和返回登录入口。
- 当前栈：Next.js 16.4、React 19.3、Tailwind 4.3；`@/*` 已指向 `src/*`，没有现有 `components.json` 或 shadcn 组件目录。
- 采用官方源码的手动适配方式，没有执行会写入全局主题的 CLI 初始化。认证使用官方组件结构的本地原生子集，按当前需求裁剪未使用的变体、组合组件接口和工具依赖。
- `controls.tsx` 保留 Card/Header/Content/Title、Field/FieldGroup/Label、Input、Button 的组件职责和 `data-slot` 结构。样式翻译为认证专用 CSS Module，避免现有全局 `input`、`button` 的深色样式覆盖新 UI，也避免新主题外溢。
- 新增依赖：无。`package.json`、锁文件、Tailwind/PostCSS 配置、根 layout 和全局样式均未改动。
- 上游 MIT 许可保存在 `third-party/shadcn-LICENSE.txt`。

## 统一规则

页面背景 `#f5f5f5`，卡片白色，正文 `#171717`，辅助文字 `#626262`，边框 `#e5e5e5`。卡片最大宽度 384px、圆角 12px、24px 内边距；沿用模板轻微边界阴影，没有添加渐变、装饰图形、毛玻璃或动画。两页共用 20px 标题、14px 正文和标签；输入为 16px，避免手机自动放大；输入与主按钮高 44px、圆角 6px。

卡片使用 `h1` 作为页面标题。标签通过 `htmlFor` 与输入关联，密码规则有 `aria-describedby`，服务端错误用 `role=alert`，提交与成功提示用 `role=status`。提交期间字段组和按钮禁用，按钮显示“处理中…”，表单标记 `aria-busy`。

保留真实 Turnstile 安全验证。控件采用原生 compact 外观，以适应 320px 窄屏，不缩放或隐藏安全验证，也不绕过服务端校验。

## 原有功能接线

| 功能           | 路由与实现                                                                           |
| -------------- | ------------------------------------------------------------------------------------ |
| 邮箱密码登录   | `/auth` 或 `/auth?mode=login`，原 `signInWithPassword`                               |
| 注册           | `/auth?mode=signup`，原 `signUp`，有 session 时进入 `/dashboard`，否则进入验证码视图 |
| 8 位邮箱验证码 | `/auth?mode=verify`，原数字过滤、长度 8、`verifyOtp` 和错误处理                      |
| 重发验证码     | `/auth?mode=resend`，原 `resend({type: "signup"})`，发送后进入验证码视图             |
| 找回密码       | `/auth?mode=reset`，原 `resetPasswordForEmail` 与 recovery callback                  |
| 新密码         | `/auth?mode=update`，原 `getUser`、`updateUser`、成功提示和进入控制台入口            |
| 回调与会话     | 原 `/auth/callback` GET/POST、PKCE、SSR Cookie、proxy 和 verifiedClaims 保持不变     |
| 用户资料       | 原 `auth.users` → `profiles` 创建触发器及账户关联保持不变                            |

界面模式改为受白名单约束的 URL 参数，使注册、验证和重发状态能直接访问并在刷新后恢复相应界面；仍然只有一个 AuthForm 和一套原有提交函数，未引入第二套认证流程。

原有校验是邮箱必填、邮箱格式、密码至少 8 位，注册没有姓名或确认密码要求。因此没有照搬模板的 Full Name、Confirm Password，也没有新增字段或数据库写入。`profiles.display_name` 原本允许空值，由原有账号设置处理。

源码没有 Google OAuth 接线，因此不展示 Google 按钮。不加入模板中指向 `#` 的服务条款、隐私政策演示链接。

## 修改文件

- `src/app/auth/page.tsx`：认证页面入口、页面标题和独立加载外壳。
- `src/components/AuthForm.tsx`：接入模板结构、模式跳转、原生验证、错误和提交状态；保留原提交函数。
- `src/components/auth/controls.tsx`：认证专用模板基础组件。
- `src/components/auth/AuthForm.module.css`：局部设计变量、控件、卡片、状态和响应式规则。
- `scripts/smoke.mjs`：把旧英文标题断言改为当前登录标题，并检查根页面未登录时最终到达 `/auth`。
- `third-party/shadcn-LICENSE.txt`：上游许可。
- 本文档。

进入本阶段前工作区已有 Dashboard/header/global CSS 改动，以及 AuthForm 中 signup/resend 回调使用浏览器当前 origin 的改动；全部保留。本阶段没有提交、推送或部署。

## 已执行验证

- `npm run lint`、`npm run typecheck` 通过。
- `npm test`：现有 30 项测试全部通过，包含回调、迁移、资料关联、RLS、事务和业务数据规则；数据库用例使用现有隔离测试环境，不连接生产进行写入。
- `npm run build`：生产编译和页面生成通过。
- `npm run test:smoke`：本地页面保护、未登录 API 拒绝及错误状态通过。首次因旧英文品牌标题断言失败，修正断言后通过，未放宽认证保护检查。
- 本地验证脚本比对修改前后 `async function submit`，内容完全一致；六种模式的真实 SSR 页面均返回 200 并包含对应标题，无效 callback 返回 303 到 `/auth`。
- 浏览器实际访问 login/signup，验证互相切换、找回入口、重发入口、验证码长度和过滤规则、直接访问及刷新。
- 浏览器验证空字段、邮箱格式、密码不足 8 位被原生验证阻止。
- 使用不存在的 `.invalid` 邮箱完成一次真实登录失败请求，Supabase 返回 `Invalid login credentials`；期间观察到 `aria-busy=true`、主按钮禁用和“处理中…”状态，随后显示错误。没有创建账户、发送注册邮件或修改密码。
- 1440×900、390×844、320×740 实际截图检查：浅灰背景、白色控件、卡片与页边距正常，无横向溢出。
- 从认证页经客户端跳转回 Dashboard，确认认证卡片样式未外溢：日历字段仍为 `rgb(20,26,31)`、卡片仍为 `rgb(32,38,43)`，布局与原有整页滚动规则保持不变。已有会话刷新后仍能访问受保护 Dashboard。
- 截图位于忽略目录 `test-results/auth-template/`：login/signup 的 desktop/mobile、真实失败提示、320px 重发界面和 Dashboard 回归截图。

## 未验证与手动验收

- 没有进行真实新邮箱注册、收件、有效 8 位验证码验证以及新账号首次进入控制台的端到端测试；没有创建演示账户或伪造成功响应。
- 没有使用有效密码完成一次新的成功登录；确认的是已有真实会话在刷新后继续有效。
- 没有发送真实密码重置邮件或执行新密码保存；仅验证入口、视图和原调用保留。密码变更应由账号所有者手动完成。
- 无需新增 Supabase Provider、Redirect URL 或数据库配置。生产环境仍需原有 Supabase 与 Turnstile 环境变量；本次未更改它们。
- 部署后请用你自己的邮箱完成“注册 → 收件 → 输入 8 位验证码 → 控制台 → 刷新”，再手动验收一次忘记密码流程。
