# 架构与边界

UI（src/components）→ HTTP API（src/app/api）→ 业务校验/计算（src/lib）→ Supabase（src/lib/supabase、src/lib/repository）。所有请求使用当前用户 JWT，未使用 service_role。

Auth users → profiles。exercises 与 equipment 独立。session → workout_exercises → sets。meal_entries → photos。import_batches → sessions。所有业务行有 user_id；组合外键阻止跨用户父子关联。

历史动作/器材名称及规则在 workout_exercises 快照，删除配置不删除历史；配置软删除。训练/照片软删除并可恢复。整次训练保存使用数据库事务和版本冲突检测，避免多设备覆盖。导入幂等键为文件 SHA256；相同文件被拒绝。批次撤销只软删除仍为初始 revision 的记录，手动修改的训练保留。

重量的 raw 输入、mode、unit、value 与 planned_weight 分开。total 仅为装载质量，绝不代表机械阻力。未知史密斯杆重保留 null。辅助重量单独标注。统计只计 work 角色。

默认日期为 Asia/Shanghai 下的日历日期，数据库 date 保存用户选择的日期；时间保存 timestamptz。餐次与训练独立，同日可多次训练。暂停/恢复、组完成、休息截止、RIR/RPE 字段预留，第一阶段不启动倒计时。

未连接云服务时应用明确提示配置缺失。本阶段不搭建替代数据库、不保存到 localStorage，不声称云端验收通过。
