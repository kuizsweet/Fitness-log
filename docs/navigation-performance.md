# 菜单切换实测与改进

2026-10-14，本地 Next.js 开发服务，真实测试用户的官方 SSR Cookie。没有关闭认证、TLS 或使用模拟成功响应。

## 定位

此前页面请求在 proxy 和页面布局重复调用远程 Auth `getUser`，API 同样重复经过入口和自身验证。开发日志中约 6 秒的请求，入口验证占约 5.6 秒，应用处理约 0.3 秒。因此主要证据指向远程认证等待；没有证据表明卡片样式是主因。开发模式首次按需编译也可能增加等待，且缺少即时导航反馈会让等待更明显。

## 已修改

- 按 [Supabase SSR 官方指南](https://supabase.com/docs/guides/auth/server-side/creating-a-client)使用 `getClaims` 验证 JWT 签名、有效期和身份。当前项目 ES256 签名可使用 SDK 缓存的公开验证密钥；没有直接信任 Cookie 或 `getSession`。
- API 由自身认证入口负责，避免同时经过 proxy。所有写入仍实时调用 `getUser` 并检查 Origin。RLS、私有响应和 Cookie 刷新保留。读取的有效 JWT 在到期前不逐次查询服务器撤销状态，见 [Supabase 会话指南](https://supabase.com/docs/guides/auth/server-side/advanced-guide)。
- 添加导航等待提示和 App Router 加载边界。生产使用 Next.js 原生 Link 预取机制；开发环境的预取行为不同，不以本地结果代替生产验收。
- 同一路径后台更新期间保留已经加载的数据；保存成功和窗口重新获得焦点后更新真实数据，不制造空白闪烁或假数据。

## 测量结果

`npm.cmd run perf:navigation -- after` 的两轮请求，每轮四个地址并行。报告写入被 Git 忽略的 `test-results/navigation-after.json`；此前报告为 `navigation-before.json`。表中是收到完整 HTTP 响应所需时间，不是完整页面显示或交互耗时。

| 地址 | 修改前第二轮 | 修改后第二轮 |
|---|---:|---:|
| 首页（原 /journal，现 /dashboard） | 463 ms | 125 ms |
| /train | 509 ms | 125 ms |
| /catalog | 374 ms | 125 ms |
| /api/profile | 563 ms | 447 ms |

首轮页面响应修改前约 5.86 秒，修改后约 6.43–6.51 秒。测试之间重启了开发进程，修改后另有真实服务验证并发，只有各一次小样本，不能声称是受控性能基准或保证相同倍数提升。

上述为公钥预加载前的历史测量：重复请求改善，但首次连接仍慢。后续排查与修复见下文。

## 首次连接专项修复

同日追加，使用现有 Mihomo 127.0.0.1:7890，无系统 DNS、代理开关或规则改动。DNS 约 6–8 ms，返回 198.18.* Fake-IP；管理接口只读确认 TUN 开启。因此单独禁用 Node 环境代理仍不等于绕过 TUN 的直连测试。

独立 HTTP CONNECT/TLS 诊断：本地代理隧道 200，耗时 4 ms；随后 TLS 5331 ms，证书验证成功。curl 复测 HTTPS 建立约 5.36–5.47 秒，临时用公开 IPv4 仍约 5.47 秒，不能归因于本机 DNS 查询慢。证据定位在经代理出口建立远端安全连接的链路，尚不能区分具体节点、上游路由或远端网络的责任。没有证据需要迁移 Tokyo 数据库；本地 localhost 请求也不经过 Vercel 机房。

### 实施

- 通过 [Next.js instrumentation.register](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation) 在运行服务时预加载公开 JWKS。构建阶段跳过，无配置时跳过；加载失败保留官方验证路径。
- 同一进程合并公钥并发请求，严格五分钟过期，下载时间计入有效期，不在失败后继续用过期缓存。只共享公开公钥，Cookie、身份和业务响应没有共享缓存。仍由 [Supabase 官方 getClaims](https://supabase.com/docs/guides/auth/jwts) 验签并检查过期，写入保留实时 getUser。
- 本地现有代理环境通过官方 Undici EnvHttpProxyAgent 复用连接，保持一分钟空闲连接，支持协商 HTTP/2。独立诊断确认 h2 且 authorized=true。Vercel 不使用本地连接限制或代理地址；未新增后台心跳、盲目重试写入或关闭 TLS。使用 [Node 官方自定义 dispatcher 接口](https://nodejs.org/api/globals.html#fetch)。
- 27 项单元/SQL 测试通过，其中公钥测试覆盖并发合并、过期及失败重试。这些单元输入与下述真实服务验证分开记录。

### 最终实测

全新启动当前生产构建，监听独立的 localhost:3001，运行 perf:navigation -- cold --full。首次 API 与三个页面并发，全部真实 HTTP 200。报告 test-results/navigation-cold.json 被 Git 忽略。

| 地址 | 首轮完整响应 | 第二轮完整响应 |
|---|---:|---:|
| 控制台 | 351 ms | 57 ms |
| 训练页面 | 331 ms | 57 ms |
| 动作与器材页面 | 331 ms | 57 ms |
| 训练数据 | 902 ms | 709 ms |
| 个人资料 | 1159 ms | 471 ms |
| 三餐数据 | 1412 ms | 1097 ms |
| 签到数据 | 2126 ms | 1348 ms |
| 动作与器材数据 | 2991 ms | 1790 ms |

这是服务已经预加载后的首次请求；启动的公钥预加载仍花了 5903 ms，没有消灭首次远端连接成本，只将它移到启动阶段并复用。长时间闲置、网络断线、服务端关闭连接或 Vercel 新实例冷启动仍可能重新等待。不是完整页面显示耗时、不是统计基准，也不是已上线 Vercel 的测速；修改前后开发/生产模式不同，不宣传保证加速倍数。

真实会话刷新、退出后 401、两账号隔离、保存训练分类、伪造签名拒绝均在独立生产实例重新检查。测试生成记录按精确 UUID 清理。首次测试用 127.0.0.1 Origin 与实例主机不一致导致 403，不计通过；改为匹配的 localhost 后验证，未放宽来源检查。

下一步若本地长时间闲置后仍卡住，需要比较现有代理的不同出口；当前没有擅自切换节点。线上需部署源码后单独测试。真正的网络链路延迟无法靠页面预取保证消除，也不应以换数据库区域或关闭验证为先行方案。
