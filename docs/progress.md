# 七阶段交付记录

2026-10-13，范围限于当前工作区。没有修改无关项目或用户提供的原文件。

这是初次开发阶段的历史交付记录。后续真实 Supabase 接入结果见 `docs/supabase-validation.md`。

| 阶段 | 新增/修改文件 | 已实现 | 尚未实现或未验证 | 检查/阻塞 |
|---|---|---|---|---|
| 1 架构 | PRODUCT.md、docs/architecture.md、package.json | 空目录边界、技术选型、实体关系、重量/日期/版本规则 | 视觉品牌按需求留待后续 | 无旧源码；无云凭据 |
| 2 基础与认证 | src/lib/supabase/*、src/proxy.ts、src/app/auth/*、supabase/migrations/*、.env.example | Auth SSR、邮箱注册/登录/退出/重置、页面/接口保护、profile、RLS/私有 Storage | 真实注册邮件和会话跨设备 | 构建与 SQL 引擎迁移通过；实际 Supabase 未连接 |
| 3 训练 CRUD | src/lib/domain.ts、src/lib/repository.ts、src/app/api/catalog、sessions、history、src/components/Catalog、SessionEditor、ExerciseEditor、SetEditor、WeightInput | 独立动作/器材、六类重量、快照、组角色/标签、复制/排序、事务保存/并发检测、软删除/恢复 | 登录后浏览器完整 CRUD 验收 | 计算、SQL 事务、快照及外键测试通过 |
| 4 日期与三餐 | Journal、Meals、src/app/api/meals、photos、src/lib/photos.ts | 月历/按天/今天/前后日、多次训练、三餐多图/预览/替换、压缩/去 EXIF、签名 URL | iPhone 真机拍照、真实 Storage 上传；HEIC 解码取决于服务器 | 图片实际转换测试通过；云 Storage 未连接 |
| 5 Excel | src/lib/import/*、Import、ImportMapping、ImportPreview、src/app/api/imports/*、import_previews 迁移 | 多表、合并单元格、常见表达、人工映射/逐行修正、计划/实际、来源报告、预览确认、事务/幂等/安全撤销 | 真实用户 Excel 适配；嵌入图片自动餐次绑定 | 真实生成 xlsx 及 PostgreSQL 回滚/撤销测试通过；缺少用户样本 |
| 6 独立训练页 | Training、src/app/(private)/train、计时相关 schema 字段 | 开始、逐组录入、完成、暂停/恢复、结束，与日志共用保存接口 | 自动休息倒计时按要求留待后续 | 时间/RIR/RPE/休息字段已保存；真机流程未验证 |
| 7 质量与部署 | tests/*、scripts/*、src/lib/export.ts、src/app/api/export、Settings、README、docs/validation.md | lint/typecheck/build、单元与 SQL 引擎测试、导出、照片备份、真实服务隔离脚本、部署说明 | 实际 Vercel 部署、双设备/双用户服务验收 | 最终执行结果见 validation；仍需 Supabase 参数 |

前六阶段已进行代码实现与分阶段检查；服务侧未配置的项目不能视为验收完成。测试中的工作簿和图片仅为明确的测试输入，从未填入应用的用户历史数据。
