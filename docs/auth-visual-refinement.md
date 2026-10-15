# 认证页面视觉修正与验收

## 最新修正：注册与验证码合并（2026-10-15）

收到两张当前页面截图及登录页批注后，撤回此前“注册、验证、重发分成独立视图”的呈现。以下旧版记录中的独立验证标题、入口与提交函数逐字不变等描述只适用于旧版，不代表当前实现。

当前只有登录、注册两个主要入口；密码找回仍有其原有辅助流程。注册卡片直接排列邮箱、密码、8位验证码输入及旁边的发送/重发按钮、安全验证和“注册并登录”。发送成功保持原注册路由及卡片，保留邮箱；密码按原先策略从内存清空，输入框变为只读并明确提示已设置，不伪造星号密码。更换已提交的邮箱会清除旧验证码和待验证状态。

首次发送使用原 `signUp`，待验证状态下重发使用原 `resend(type=signup)`；主按钮使用原 `verifyOtp(type=email)`。账号创建仍发生在Supabase注册请求中，验证成功才建立会话，并不是提前绕过邮箱验证。发送与重发继续要求真实Turnstile token；OTP校验沿用原先不额外要求captcha的方式，不重复消耗已用于发信的token。服务器有效期、发送限制、错误处理及回调不变。没有增加新的接口、数据库字段、生产配置或依赖。

登录移除注册验证码入口；忘记密码位于密码输入框下方右对齐，原找回流程继续可达。历史 `?mode=verify`、`?mode=resend` 链接兼容为同一张完整注册卡片，不再提供单独的验证界面。

参考 [GOV.UK账号创建](https://design-system.service.gov.uk/patterns/create-accounts/) 对清晰注册路径及避免重复输入的要求、[邮箱确认](https://design-system.service.gov.uk/patterns/confirm-an-email-address/) 的重发与错误恢复原则；技术接线核对 [Supabase密码注册](https://supabase.com/docs/guides/auth/passwords)、[重发](https://supabase.com/docs/reference/javascript/auth-resend) 和 [OTP校验](https://supabase.com/docs/reference/javascript/auth-verifyotp)。同卡呈现是本项目要求，不声称所有Web注册都必须如此。

本轮验证：lint、typecheck、生产构建和30项现有测试通过；本地HTTP smoke通过。AST比较原版和本轮六种Supabase SDK调用，方法、参数及回调URL全部保持一致，变化仅为两类UI操作的触发位置。六个历史模式SSR、无效回调拒绝均通过。

浏览器检查1440×900、390×844、320×740：无横向溢出，验证码与发送按钮保持同一行，320px时输入仍可展示8位数字，Turnstile不缩放。实际检查空邮箱、短密码发送拦截、验证码长度门槛、更换邮箱清除验证码、注册/登录/找回跳转，以及真实无效OTP请求的错误和处理中状态；错误仍留在原注册卡片。截图和检查脚本位于 `test-results/auth-inline/`。

未执行真实新账号注册发信、成功收件、重发和有效OTP登录；不创建演示账户或模拟成功状态。发送成功后的只读密码和重发分支已检查代码及请求参数，未在真实邮箱上完成端到端验证。生产配置和用户数据未修改。

本轮仅修改 `src/components/AuthForm.tsx`、`src/components/auth/AuthForm.module.css` 及本文。其他业务模块保持原状。

---

## 前一版记录（已被上述交互修正替代）

2026-10-15。本轮仅修改认证UI，保留进入任务时已有的控制台、全局样式及认证模板改动；未提交、推送、部署或修改生产配置。

## 依据与问题

核对官方 [login-01](https://ui.shadcn.com/view/new-york-v4/login-01)、[signup-03](https://ui.shadcn.com/view/new-york-v4/signup-03) 页面与注册表源码。本条任务提及的四张截图没有随消息收到，因此不能声称按四张图逐像素还原。官方实际显示深色主题，本地按现有要求保留浅灰背景、白色卡片。

- 方形验证区域来自显式 compact 配置和140px容器。按 [Cloudflare尺寸规范](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/)，compact为150×140、flexible高65且最小宽300。
- 底部重复堆放注册邮箱验证、重发、找回密码及账号切换入口，混淆了不同流程。
- 认证继承旧全局字体；缺少中文优先规则。没有发现页面transform、CSS zoom或错误Tailwind类导致缩放。
- 当前技术栈为Next.js16.4/React19.3，现有认证原生组件和CSS Module适合局部修正；已核对安装版本Next.js CSS指南，不初始化第二套全局主题。

## 设计规则与流程

保留login-01左对齐标题、密码旁找回入口、主按钮、底部注册入口。signup-03保留外置kuizfit品牌、居中标题、白色卡片及返回登录。外置品牌只在注册页显示。

- 字体：PingFang SC、Noto Sans SC Variable、Noto Sans SC、Microsoft YaHei UI、Microsoft YaHei、sans-serif，仅认证容器使用。没有打包苹果字体。
- 新增固定依赖 `@fontsource-variable/noto-sans-sc@5.3.1`，本地提供OFL-1.1变量字体，unicode-range分片按需请求，font-display为swap。见 [Fontsource](https://fontsource.org/fonts/noto-sans-sc/use) 及 `third-party/noto-sans-sc-LICENSE.txt`。
- 标题24px/600/32px，标签14px/500/19.6px，说明及链接14px/21px，输入16px/24px。仅局部调整，没有全局字号变更。
- 卡片最大384px、圆角12px、内边距24px；字段组20px、字段内部8px；输入和主按钮高44px、圆角6px。高度由内容自然决定。
- 44px控件和24px标题是对中文及触摸操作的适配，未宣称复制官方36px控件的像素尺寸。没有增加装饰、渐变或动画。

Turnstile使用原生flexible，高65px；320px屏幕时只有验证容器借用卡片内边距，给控件保留至少300px宽度。不缩放或拉伸iframe。加载提示由真实组件加载回调控制；sitekey、token、成功/错误/超时/过期回调、提交后的reset和后端验证保持原状。

| 模式 | 真实业务与入口 |
| --- | --- |
| login | 原signInWithPassword；邮箱密码；OTP不常驻；密码规则文字仅在注册/修改时展示，minLength=8保留 |
| signup | 原signUp；无session时仍清空密码、保留邮箱并自动进入verify |
| verify | 原verifyOtp(type=email)；8位数字、pattern/maxLength、otp_expired提示保留；标签旁放重发入口 |
| resend | 原resend(type=signup)；在验证码区域内显示禁用输入及返回输入入口，安全验证后才能重发，成功回verify |
| reset | 原resetPasswordForEmail和recovery callback；入口在登录密码旁 |
| update | 原getUser、updateUser、成功提示和控制台入口 |

正常登录/注册仅保留一个“已收到注册验证码？”入口，位于密码区域之后，进入注册邮箱验证视图；不是密码登录的二次验证。没有添加姓名、确认密码、Google、演示条款链接或数据库字段。有效期与发送限制仍由原Supabase流程负责，没有伪造倒计时。

## 实际渲染

浏览器截图、修改前源码和验证脚本位于忽略目录 `test-results/auth-refinement/`。官方截图API最初超时，后通过直接截图接口取得实图并检查。

| 画面 | 视口 | 卡片宽×高 | 对照 |
| --- | --- | --- | --- |
| 本地注册修改前 | 1440×900 | 384×约637 | compact和重复底部入口 |
| 本地注册修改后 | 1440×900 | 384×约550 | flexible、单一验证入口 |
| 官方signup-03 | 1440×900 | 384×约517 | 含姓名、确认密码及示例法律说明，本地不新增这些业务字段 |
| 本地登录 | 1440×900 | 384×约522 | 左对齐标题、OTP默认收起 |
| 官方login-01 | 390×844 | 342×约446 | 16px标题、36px输入、示例Google按钮 |
| 本地登录 | 390×844 | 358×约522 | 24px中文标题、44px控件、真实Turnstile |
| 本地重发 | 320×740 | 304×约510 | 验证容器约303×65，无溢出、无缩放 |

官方与本地对应截图的visualViewport.scale均为1、CSS zoom为1、DPR约1，在同一浏览器环境比较。中文及真实安全功能的适配使页面不与英文演示等高。短屏允许正常纵向滚动，没有固定卡片高度。

截图：signup-before、signup-desktop、signup-mobile、login-desktop、login-mobile、verify-mobile、resend-320、login-error、otp-error、official-login-mobile、official-signup-desktop（均为PNG）。

## 验证结果与限制

- lint、生产构建、TypeScript和页面生成通过；现有30项测试全部通过，数据库用例使用现有隔离环境，没有生产写入。
- 本地HTTP smoke通过，保护页面及未登录API拒绝未回归。终端初次本地连接被沙箱拒绝，获准连接本地服务器后重跑通过。
- 本轮修改前后async submit逐字比对一致；六种SSR视图返回200，无效callback返回303到auth。
- 实际验证登录/注册切换、OTP入口、重发/返回输入、找回入口、8位长度和数字过滤；错误与提交状态保持可见。
- 对不存在的.invalid邮箱执行一次真实密码登录失败及一次无效8位验证码校验；出现Invalid login credentials和原有过期/错误验证码提示。没有创建账户、发邮件或改密码。
- 观察到处理中、字段/按钮禁用及错误恢复；实际观察到安全验证加载提示和Cloudflare成功外观。没有操作CAPTCHA复选框或绕过验证。
- 检查1440×900、390×844、320×740，无横向溢出。全局CSS、private layout、Supabase browser client和callback与任务开始时哈希一致；body字体保持旧字体栈。
- 当前浏览器测试会话未登录，Dashboard正确跳回auth，本轮没有进入受保护业务页面完成全量视觉复测。
- 未使用有效账号验证成功登录/刷新恢复，未实际注册收件、提交有效OTP、重发或发送密码重置邮件；这些不能用负向请求当作成功证明。新密码保存由账号所有者验收。
- Turnstile网络失败、交互挑战、token超时/过期没有自然发生，处理代码保留但动态状态未验收。不使用伪token、测试sitekey或模拟响应宣称通过。
- 四张参考图缺失，后续收到后仍需对应截图精确对照。无需新增生产配置；上线后由账号所有者验收有效邮箱的完整流程。

## 本轮文件

- `src/components/AuthForm.tsx`：入口整合、flexible、真实加载展示和字体导入。
- `src/components/auth/AuthForm.module.css`：局部字体、排版、间距及窄屏验证区域。
- `package.json`、`package-lock.json`：固定版本字体依赖。
- `third-party/noto-sans-sc-LICENSE.txt`：OFL-1.1许可。
- 本文和初版记录 `auth-ui-refactor.md` 的后续说明。
