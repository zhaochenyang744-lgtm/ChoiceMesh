# ChoiceMesh 隐私与后端 PoC 证据

| 字段 | 内容 |
| --- | --- |
| 版本 | V1.0 |
| 日期 | 2026-08-24 |
| 范围 | 本地 Supabase SQL 迁移与静态结构检查 |
| 结论 | 关键隐私边界已有可审查 PoC；未完成真实双账号集成测试 |

## 1. 已实现的结构

- 6 张业务表均显式启用 RLS。
- `private_details` 的读取、插入、更新限定为 `user_id = auth.uid()`；插入还要求当前用户属于房间。
- `room_summary(room_id)` 只返回计数，不返回身份、原文、结构化私密详情、预算或通勤字段。
- 创建房间、加入、支持提案、汇总和发布使用服务端事务函数；安全定义函数固定 `search_path = public`。
- `0003_function_privileges.sql` 撤销 PostgreSQL 默认的 PUBLIC/anon 函数执行权，仅向 authenticated 开放。
- 预算边界风险只在提案成本严格高于成员预算上限时计数；等于上限不再误报。

## 2. 可复现的静态检查

运行 `node scripts/check-privacy-boundary.mjs`，当前结果为：

```text
PRIVACY_BOUNDARY_STATIC_OK rls=6 owner-only-private-details anonymous-summary explicit-rpc-grants
```

检查覆盖 RLS 声明、私密详情所有者策略、匿名汇总返回字段和 RPC 权限收紧。它能防止迁移文件中的明显回归，但不会连接数据库或模拟攻击。

## 3. 仍未完成

- 两个真实 Supabase 账号的越权读取、更新与 RPC 集成测试。
- 邀请码枚举、并发发布、重复支持和事务竞争的动态测试。
- 审计日志、用户数据导出/删除入口、备份恢复和供应商留存政策验证。
- 渗透测试、合规评估和生产监控。

## 4. 作品集表述边界

可以说：设计并实现了 owner-only RLS、匿名汇总和显式 RPC 权限的后端 PoC，并用静态检查防止关键规则漂移。

不能说：已经证明端到端隐私、通过生产安全验证、满足法律合规或已准备正式上线。
