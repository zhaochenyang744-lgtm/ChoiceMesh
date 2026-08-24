# ChoiceMesh V2 事件字典与漏斗模板

| 字段 | 内容 |
| --- | --- |
| 版本 | V1.0 |
| 日期 | 2026-08-24 |
| 用途 | 个人项目的测试记录与示例分析，不建设生产埋点平台 |

## 1. 事件字典

| 事件 | 触发时机 | 必要属性 | 不得记录 |
| --- | --- | --- | --- |
| `room_created` | 房间事务成功 | `room_id_hash`, `group_size_target`, `participation_rule`, `occurred_at` | 房间标题、真实身份 |
| `invite_joined` | 成员首次加入 | `room_id_hash`, `member_id_hash`, `join_order`, `occurred_at` | 邮箱、邀请码原文 |
| `details_submitted` | 文本或手动草稿生成 | `room_id_hash`, `member_id_hash`, `entry_mode`, `ai_result`, `occurred_at` | 原文、预算、通勤、摘要 |
| `draft_edited` | AI/手动草稿被修改 | `room_id_hash`, `member_id_hash`, `changed_field_count`, `occurred_at` | 修改前后具体内容 |
| `details_confirmed` | 成员明确确认 | `room_id_hash`, `member_id_hash`, `attendance_class`, `occurred_at` | 私人原因与具体限制 |
| `proposal_changed` | 新提案获不同成员支持并成为当前提案 | `room_id_hash`, `proposal_version`, `reconfirmation_count`, `occurred_at` | 提案备注中的私人内容 |
| `published` | 发布事务成功 | `room_id_hash`, `proposal_version`, `confirmed_count`, `elapsed_seconds`, `occurred_at` | 成员详情 |

`ai_result` 只允许：`success`、`timeout`、`upstream_error`、`invalid_output`、`manual`。匿名哈希只用于同一测试会话内串联，不跨研究长期追踪。

## 2. 主漏斗

```text
room_created
→ 至少一名 invite_joined
→ 目标成员 details_confirmed
→ published
```

核心转换：

- 建房 → 发布完成率 = 有 `published` 的房间 / 有 `room_created` 的房间。
- 全员/规则确认率 = 达到参与规则的房间 / 有成员加入的房间。
- 中位决策耗时 = `published.occurred_at - room_created.occurred_at`。
- AI 草稿编辑率 = 有 `draft_edited` 的 AI 成功草稿 / `ai_result=success` 的草稿。
- 降级完成率 = AI 失败后仍产生 `details_confirmed` 的成员 / 发生 AI 失败的成员。

## 3. 分组维度

只在样本允许时按参与规则、组员人数、提案变更次数、工具顺序和录入方式分组。任何分组少于 3 组时只展示原始案例，不报告百分比差异。

## 4. 空白漏斗模板

| 阶段 | 房间数 | 相对上一步 | 主要退出原因 |
| --- | ---: | ---: | --- |
| 建房 |  | 100% |  |
| 有成员加入 |  |  |  |
| 达到确认规则 |  |  |  |
| 正式发布 |  |  |  |

## 5. 合成示例（仅演示计算）

假设 5 个合成房间中，5 个建房、4 个有成员加入、3 个达到确认规则、3 个发布，则建房 → 发布为 3/5。该数字只展示计算方法，不是 ChoiceMesh 的测试结果，不能进入作品集成果陈述。
