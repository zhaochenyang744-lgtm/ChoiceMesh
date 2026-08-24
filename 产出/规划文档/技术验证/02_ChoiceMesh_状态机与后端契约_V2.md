# ChoiceMesh 状态机与后端契约 V2

| 字段 | 内容 |
| --- | --- |
| 版本 | V2.0 |
| 更新日期 | 2026-08-11 |
| 状态 | V2 目标后端契约；未实现部分见 `07_ChoiceMesh后端实现状态与缺口_V2.md` |

## 1. 核心实体

| 实体 | 关键字段 | 约束 |
| --- | --- | --- |
| Room | `title`, `start_at`, `end_at`, `participation_rule`, `minimum_confirmed`, `invite_code` | 邀请码唯一且可撤销；仅支持最低人数或全员确认 |
| Membership | `room_id`, `user_id`, `joined_at` | 创建者只标识来源，不拥有读取私人条件的额外权限 |
| PrivateCondition | `raw_text`, `extraction`, `status`, `expected_confirmation_at` | 仅本人和服务端可读；草稿不计入共同状态 |
| Proposal | `title`, `location`, `start_at`, `end_at`, `estimated_cost`, `proposal_state`, `created_by` | 同一房间仅一个 `current`；信息不完整时为 `incomplete` |
| ProposalSupport | `proposal_id`, `user_id` | 提议者不能支持自己的提议；达到支持门槛后由服务端原子切换 |
| ContinuationDecision | `room_id`, `scope`, `confirmations` | 最低人数满足但仍有人未确认时，需明确决定继续 |
| PublishedVersion | `room_id`, `proposal_snapshot`, `confirmed_count`, `published_by` | 只追加，不覆盖 |

## 2. 状态

成员条件：

```text
no_response → submitted → needs_verification → confirmed
                                  └──────────→ unavailable
```

- `submitted`、`needs_verification`、`unavailable` 都不计入确认人数；
- 提醒、AI 推断、截止时间到达和群聊沉默不得自动转为 `confirmed` 或 `unavailable`；
- 受提案变化影响后，`confirmed` 可被服务端重置为 `needs_verification`，但原确认记录保留在审计日志中。

提案状态：

```text
incomplete → pending_review → current → published_snapshot
                  └──────────────────→ superseded
                  └──────────────────→ withdrawn
```

创建者的完整初始提案直接成为 `current`。成员提出的变更或替代提案只能先进入 `pending_review`。

## 3. 原子规则

1. `support_proposal` 验证支持者不是提议者，且在同一房间；满足门槛后原子切换 `current`；
2. `withdraw_proposal` 仅允许提议者撤回自己的 `pending_review`；
3. 支持一项时，同房间其余 `pending_review` 原子转为 `withdrawn`；
4. 切换当前提案后，服务端计算受影响条件并把相应成员改为 `needs_verification`；
5. `publish_version` 在事务中重新验证：当前提案完整、无硬冲突、无待审覆盖、参与规则、继续决定、再确认和发布者的显式确认记录；
6. `raise_issue` 只能创建新的协调轮次，不得更新或删除 `PublishedVersion`；
7. 共同查询只能返回匿名聚合，不返回 `PrivateCondition.raw_text`、精确预算或路线。

## 4. API 边界

- `POST /rooms`：创建房间与完整初始提案；
- `POST /rooms/join`：使用邀请码加入；
- `POST /api/parse-details`：生成当前用户的私密 AI 草稿；
- `POST /rooms/:id/private-conditions/confirm`：本人确认或更新条件；
- `POST /rooms/:id/proposals`：创建待审变更/替代提案；
- `POST /proposals/:id/supports`：支持待审提案；
- `POST /proposals/:id/withdraw`：提议者撤回未获支持的待审提案；
- `POST /rooms/:id/continuation-decisions`：显式接受按当前人数继续；
- `POST /rooms/:id/published-versions`：创建新发布版本。
