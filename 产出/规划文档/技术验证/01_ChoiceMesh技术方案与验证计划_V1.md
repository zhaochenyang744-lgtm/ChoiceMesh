# ChoiceMesh 技术方案与验证计划

| 字段 | 内容 |
|---|---|
| 文档版本 | V1.0 |
| 更新日期 | 2026-07-28 |
| 当前状态 | 待验证 |
| 原则 | 先验证风险，再开发完整界面 |

## 1. 技术目标

验证 ChoiceMesh 是否能以个人项目可维护的方式实现：

- 多成员房间和数据隔离；
- 自然语言结构化；
- 硬性约束过滤；
- 软性偏好排序；
- 可解释推荐；
- 反馈修订；
- 全员确认；
- 自动化评测与回归。

## 2. 建议技术架构

技术版本在进入开发时再锁定，当前只确定技术类别：

| 层 | 建议 |
|---|---|
| Web 应用 | Next.js + TypeScript |
| UI | Tailwind CSS 或轻量组件系统 |
| 数据校验 | Zod Schema |
| 数据库 | 托管 PostgreSQL |
| 身份方式 | 匿名成员 Token + 房间码 |
| AI | 支持结构化输出的模型 API |
| 规则引擎 | 独立 TypeScript 模块 |
| 单元测试 | Vitest |
| 端到端测试 | Playwright |
| 部署 | 适合 Next.js 的托管平台 |
| 分析 | 自建匿名事件表或隐私友好分析工具 |

在正式选型前应核对当前稳定版本、免费额度、数据保留和部署限制。

## 3. 模块边界

```text
Web UI
├─ 房间与成员
├─ 候选方案
├─ 约束与偏好输入
├─ 推荐与解释
├─ 反馈与修订
└─ 最终确认

Application API
├─ Room Service
├─ Candidate Service
├─ Preference Service
├─ Decision Service
└─ Evaluation Service

Decision Core
├─ Schema Validation
├─ Constraint Filter
├─ Preference Scoring
├─ Fairness Metrics
└─ Stable Ranking

AI Layer
├─ Natural Language Parser
├─ Clarification Generator
├─ Trade-off Explainer
└─ Feedback Summarizer
```

`Decision Core` 不依赖 AI，必须可以单独运行测试。

## 4. 核心数据模型

### Room

- `id`
- `title`
- `status`
- `member_target`
- `submission_deadline`
- `revision_count`
- `created_at`
- `expires_at`

### Member

- `id`
- `room_id`
- `display_name`
- `member_token_hash`
- `submission_status`
- `confirmation_status`

### Candidate

- `id`
- `room_id`
- `name`
- `start_at`
- `end_at`
- `area`
- `estimated_cost`
- `activity_type`
- `notes`
- `external_url`

### Preference

- `member_id`
- `time_windows`
- `budget`
- `travel_limit`
- `activity_preferences`
- `required_conditions`
- `free_text`
- `confirmed_at`

### DecisionResult

- `room_id`
- `decision_version`
- `rule_version`
- `model_version`
- `feasible_candidates`
- `infeasible_reasons`
- `member_scores`
- `ranking`
- `explanation`
- `created_at`

### Feedback

- `member_id`
- `decision_version`
- `acceptance`
- `reason_category`
- `comment`

## 5. 决策算法草案

### 5.1 过滤

```text
对每个候选方案：
  对每位成员：
    检查所有硬性约束
  只要一个硬性约束失败：
    候选方案 = 不可行
```

### 5.2 软性偏好评分

初始方案：

- 每个软性偏好命中记 1；
- 每位成员先计算个人命中比例；
- 候选方案保留：
  - 最低个人满意度；
  - 平均满意度；
  - 共同偏好命中数。

排序：

```text
最低个人满意度 ↓
平均满意度 ↓
共同偏好命中数 ↓
创建顺序 ↑
```

这一规则只用于 PoC，必须通过情境评测和用户研究验证。

## 6. AI 输入输出约束

详细接入方式、服务端接口、Schema、校验与降级设计见 `02_ChoiceMesh_AI接入架构_V1.md`。

### 输入

- 成员自由文本；
- 已确认的候选方案字段；
- 规则引擎计算结果；
- 允许使用的解释模板。

### 输出

- 严格 JSON Schema；
- 禁止调用不存在的工具；
- 禁止新增候选事实；
- 每个解释点带结构化依据 ID；
- 解析输出由成员确认；
- 解释输出通过一致性校验。

## 7. 技术验证任务

### PoC-01：规则引擎

目标：

- 用纯 TypeScript 输入一个房间 JSON；
- 输出可行方案、失败原因和稳定排序；
- 覆盖 20 个手工标注样例。

通过门槛：

- 硬性过滤、无解识别和稳定性均为 100%。

### PoC-02：自然语言提取

目标：

- 建立首批 30 条中英文混合样例；
- 输出固定 Schema；
- 记录错误类型和成本。

通过门槛：

- 硬性约束召回率达到初始门槛；
- 模糊表达能触发澄清；
- 用户可修改结果。

### PoC-03：解释一致性

目标：

- 为 15 个计算结果生成解释；
- 自动检查候选 ID、数字和状态；
- 人工评分取舍完整性。

通过门槛：

- 不新增事实；
- 关键数字准确；
- 失败时可以模板降级。

### PoC-04：多成员房间

目标：

- 三台浏览器或设备加入同一房间；
- 独立提交并查看聚合进度；
- 验证跨房间访问隔离。

通过门槛：

- 无覆盖、重复确认或越权读取。

### PoC-05：完整纵向切片

只实现最简单视觉，贯通：

```text
创建房间
→ 三名成员提交
→ 计算
→ 解释
→ 反馈
→ 修订
→ 全员确认
```

通过后再进入正式界面开发。

## 8. 测试策略

### 单元测试

- 时间区间；
- 预算；
- 地点；
- 硬性/软性分类；
- 个人满意度；
- 并列排序；
- 无解；
- 状态机。

### Schema 测试

- 缺失字段；
- 错误类型；
- 超出范围；
- 恶意文本；
- 模型返回非 JSON；
- 未确认解析结果。

### 端到端测试

- 创建与加入；
- 多成员并发提交；
- 推荐生成；
- 无解处理；
- 一次修订限制；
- 最终确认；
- 房间过期。

## 9. 可观测性

每次决策保存：

- 规则版本；
- Prompt 版本；
- 模型标识；
- 输入 Schema 版本；
- 延迟；
- 估算成本；
- 降级路径；
- 错误分类。

不记录 API 密钥，不在分析事件中记录自由文本。

## 10. 主要技术风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| 模糊时间解析错误 | 错误过滤 | 用户确认 + 手动表单 |
| AI 解释与计算不一致 | 信任损失 | 结构化依据 + 一致性检查 |
| 匿名 Token 泄露 | 越权访问 | 哈希保存、过期、权限校验 |
| 并发提交覆盖 | 数据错误 | 事务和版本字段 |
| 外部模型不可用 | 流程中断 | 模板降级 |
| 评分规则看似客观但不被接受 | 产品风险 | 可解释展示 + 用户研究 |

## 11. 技术决策门槛

完成 PoC 后才锁定：

- 最终模型提供方；
- 数据库与部署平台；
- 房间有效期；
- 实时同步还是轮询；
- 是否保留自然语言入口；
- 是否需要独立评测后台。
