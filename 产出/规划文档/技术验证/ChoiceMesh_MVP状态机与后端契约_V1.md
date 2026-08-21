# ChoiceMesh MVP 状态机与后端契约

> **历史版本说明**：本文件保留后端第一版状态机设计。当前的邀请码加入、受影响成员再确认与原子发布规则，见 [ChoiceMesh 状态机与后端契约 V2](05_ChoiceMesh状态机与后端契约_V2.md)。

## 目标

让多人可以共同推进活动决策，同时做到：私人原文仅本人可见；“回复”不被当作“确认”；任何正式发布均可追溯、可回看。

## 核心实体

| 实体 | 必要字段 | 说明 |
| --- | --- | --- |
| Room | `id`, `title`, `start_at`, `end_at`, `participation_rule`, `created_by` | `participation_rule` 为 `minimum_confirmed` 或 `everyone_confirmed`。 |
| Membership | `room_id`, `user_id`, `role`, `joined_at` | 创建者仅用于初始化；进入房间后不拥有读取他人私人条件的权限。 |
| PrivateCondition | `room_id`, `user_id`, `raw_text`, `extraction`, `status`, `expected_confirmation_at` | 仅本人及服务端可读取原文与解析结果。 |
| Candidate | `id`, `room_id`, `title`, `location`, `start_at`, `end_at`, `estimated_cost`, `source_type`, `created_by`, `proposal_state` | `proposal_state` 为 `current`、`pending_review` 或 `superseded`；未完整提供地点、时间、费用时必须标为 `incomplete`，不得计算为可行。 |
| ProposalSupport | `candidate_id`, `user_id`, `created_at` | 成员对方案变更或替代提议的明确支持；提议者本人不可支持自己的提议，且不能代替他人确认私人条件。 |
| ContinuationDecision | `room_id`, `scope`, `required_count`, `confirmations` | 当最低人数已满足、但有人未确认时，群体须明确决定是否按已确认人数继续。 |
| PublishedVersion | `id`, `room_id`, `candidate_snapshot`, `confirmed_count`, `published_at`, `published_by` | 只追加，不覆盖；协调下一版不能撤销已发布版本。 |

## 成员状态

`no_response` → `submitted` → `needs_verification` → `confirmed`

- `no_response`：尚未提交任何反馈。
- `submitted`：已提交自然语言，但尚未完成对解析结果的确认。
- `needs_verification`：明确表示尚待核实，或解析结果存在缺失/低置信度。
- `confirmed`：成员本人明确确认可以参加。
- `unavailable`：成员本人明确声明无法参加。

`submitted` 与 `needs_verification` 都不得计入 `confirmed_count`。系统不可因提醒、时间到期、AI 推断或群聊沉默而自动改为 `confirmed` 或 `unavailable`。

## 候选状态

| 状态 | 含义 | 可否暂选/发布 |
| --- | --- | --- |
| `incomplete` | 缺少地点、时间或费用等必要信息 | 否 |
| `blocked` | 已有硬冲突 | 否 |
| `needs_action` | 候选本身或参与状态仍需行动 | 否 |
| `viable` | 满足参与规则，且无阻塞项 | 当前提议可进入发布检查 |
| `boundary_risk` | 已验证、仍在范围内但无余量 | 可发布；必须在共同结果中保留 |

## 关键规则

1. 确认人数仅统计状态为 `confirmed` 的成员。
2. `minimum_confirmed` 规则下，达到门槛但未确认成员仍存在时，须创建 `ContinuationDecision`；至少两名已确认成员显式同意后，才可暂选方案。
3. `everyone_confirmed` 规则下，任何 `no_response`、`needs_verification` 或 `unavailable` 都阻止发布。
4. 候选在创建时必须具有 `title`、`location`、`start_at`、`end_at` 与 `estimated_cost`。缺一项只显示为待补全，不展示伪造的通勤、步行或预算适配结论。
5. 创建者的初始提议进入 `current`；成员提出对当前提议的变更或替代提议时，均先进入 `pending_review`，在满足既定支持门槛后才可取代当前提议。保存提议本身不得覆盖当前提议。
6. 变更被支持并成为当前提议后，时间、地点或费用受影响的成员必须重新确认自己的私人条件；在此之前不得发布。
7. 发布采取服务端原子事务：重新验证房间版本、当前提议可行性、成员确认状态与发布确认记录后，写入新的 `PublishedVersion` 并触发通知任务。
8. 发布后的“调整细节”或“提出替代提议”创建新的协调轮次；先前版本保持可读，后续版本只能追加。

## AI 条件解析契约

AI 仅用于把自然语言或语音转写转换为“私人草稿”，不能写入确认状态。

```json
{
  "raw_text": "I can probably do Sunday, but public transport over 45 minutes will not work. I can confirm by Friday.",
  "availability": {"value": "possible", "confidence": 0.78},
  "commute_limit_minutes": {"value": 45, "confidence": 0.96},
  "expected_confirmation_at": {"value": "2026-08-14T18:00:00+10:00", "confidence": 0.62},
  "unknowns": ["exact Sunday availability"],
  "requires_user_confirmation": true
}
```

- 低置信度或无法识别字段进入 `unknowns`，不使用默认“可以参加”。
- 用户可编辑草稿，随后选择“确认可以参加”“仍待核实”或“无法参加”。
- 语音转写须获得麦克风授权，并向用户说明音频/转写数据的处理方、保留时长与删除方式。

## AI 辅助边界

AI 只协助成员把自然语言或语音输入整理为可编辑的私密条件草稿，并以匿名汇总解释当前提议为何仍有阻塞项。

- AI 不创建、排序、选择或发布活动方案。
- 当前提议由创建者发起；替代提议只能由房间成员主动提出。
- AI 只能读取服务端聚合后的可行性摘要，不能读取、推断或暴露任一成员的原始路线、预算、原因或身份。
- 任何 AI 草稿都必须由该成员确认后才影响共同状态。

## API 最小集合

- `POST /rooms`：创建房间与初始候选。
- `POST /rooms/:roomId/invitations`：生成受邀链接。
- `POST /rooms/:roomId/conditions/draft`：创建私有 AI 解析草稿。
- `PUT /rooms/:roomId/conditions/me`：仅本人确认或更新自己的条件。
- `POST /rooms/:roomId/candidates`、`PATCH /candidates/:candidateId`：提出/调整提议。
- `POST /candidates/:candidateId/supports`：成员支持待审替代提议；达到门槛后由服务端原子切换为当前提议。
- `GET /rooms/:roomId/summary`：匿名汇总与下一步，不返回私人原文、路线、预算数字或身份归属。
- `POST /rooms/:roomId/continuation-decisions`、`POST /continuation-decisions/:id/confirmations`：明确按已确认成员继续。
- `POST /rooms/:roomId/published-versions`：原子发布新版本。
- `GET /rooms/:roomId/published-versions`：读取历史版本。

## GitHub MVP 技术边界

- 前端：Next.js / TypeScript；客户端仅渲染本人私有条件和匿名房间汇总。
- 身份与数据：Supabase Auth + Postgres + Row Level Security，或等价身份/数据库方案。
- 实时协作：Supabase Realtime 或 WebSocket；服务端推送匿名状态变更。
- 通知：异步队列发送受邀、提醒、发布与需要重新确认的通知；提醒绝不改变成员状态。
- AI：服务端调用模型；结构化 JSON Schema 校验、速率限制、审计日志与可删除原文。

## 上线前验收

- 多标签页并发确认、暂选、发布时不会出现双重发布或人数误计。
- 任何用户无法通过 API 读取其他成员的 `raw_text`、原始预算、路线或解析字段。
- 发布后的所有版本均可回看，且提出问题不会撤销旧版本。
- 无地点/时间/费用的候选不会产生可行性、通勤或预算适配结论。
- AI 草稿、语音转写、到期提醒均无法自动确认或拒绝成员。
