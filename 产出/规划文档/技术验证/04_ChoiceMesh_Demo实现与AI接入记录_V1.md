# ChoiceMesh Demo 实现与 AI 接入记录

| 字段 | 内容 |
|---|---|
| 版本 | V1 |
| 日期 | 2026-08-19 |
| 状态 | Demo 可运行；上线（真实多人后端）暂缓 |
| 对应基线 | V2 文档集 · 高保真原型 V3 |

## 这份文档记录什么

ChoiceMesh 同时存在两个可运行产物，容易被误解成"做了两遍"。这份文档说明它们各自是什么、为什么并存、以及 AI 是怎么接进去的。

## 两个产物的分工

| | 高保真原型 V3 | choicemesh-mvp（Next.js） |
|---|---|---|
| 位置 | `产出/交付物/产品原型/06_ChoiceMesh_高保真原型_V3/` | `choicemesh-mvp/` |
| 界面 | 九个页面，完整交互 | 六个页面，样式停留在 V3 之前 |
| 数据 | 浏览器内状态 | Supabase Postgres + RLS |
| 多人 | 模拟 | 真实（邀请码、成员表、行级安全） |
| AI | 曾是正则模拟，现已接真实接口 | 真实接口 |

**Demo 交付物是 V3**，由 Next.js 应用同源提供，AI 走真实链路。
**技术证据是 choicemesh-mvp**，它承载 schema、RLS、AI 接口、限流与评测。

## 为什么这样分，而不是把 V3 重写进 React

一开始的计划是让 Next.js 实现在像素层面追上 V3。拆开 V3 之后发现这不是替换样式表，而是重做产品——V3 建模了实现里没有对应数据结构的概念：

- `compare` 多方案对比（candidates 列表与每个方案的可行性状态）
- 「是否带着缺席继续」的群体决策（continuation vote）
- 发布回执与匿名提异议
- 版本历史（多个已发布版本共存、可回看）
- `coordination` 新一轮协调
- 小群体推断保护（人数少时隐藏风险的类别与归属）

把这些搬进 React 意味着一边重写界面一边扩数据模型。在「demo 是交付物、上线暂缓」的目标下，这笔投入的回报很低。

反方向的成本低一个数量级：V3 唯一虚假的部分只有一个函数 `createPrivateDraft()`，一个基于正则的模拟。把它换成真实接口调用，就得到一个界面完整、AI 真实的 demo。

**这个决定的代价要写清楚**：demo 的多人协作仍然是单机模拟，不是真实的多用户系统。真实的多人能力在 choicemesh-mvp 里，但那一侧的界面尚未追上 V3。

## AI 是怎么接进去的

`choicemesh-mvp/scripts/build-demo.mjs`：

1. 读取 V3 原型文件（**从不修改它**）
2. 复制到 `public/demo/index.html`
3. 在 `</body>` 前追加一段适配脚本

适配脚本做三件事：

- 把 `window.createPrivateDraft` 换成调用 `/api/parse-details` 的实现
- 在审核网格里补一行 Budget limit（原型的草稿网格没有预算字段，而预算是边界风险的判据）
- 保留原来的正则实现作为**离线兜底**：接口不可用时仍然出草稿，并明确提示这是浏览器本地生成的、请逐项检查

原型文件本身不被编辑，所以两者不会漂移；`public/demo/` 是生成产物，不进版本库。构建时通过 `prebuild` 自动执行。

### 字段映射

| 接口返回 | 原型展示 |
|---|---|
| `attendance: attending` | Can attend |
| `attendance: uncertain` | Possible — verify before confirming |
| `attendance: cannot_attend` | Cannot attend |
| `attendance: not_specified` | No attendance decision identified |
| `travel_limit_minutes: 45` | Up to 45 minutes, one way |
| `budget_limit: 40` | Up to $40 |
| `confirmation_by: "Friday"` | Expected Friday |

### 隐私边界没有改变

API key 只存在于服务端。成员的原文发到服务端、由服务端转发给模型，草稿只回到该成员自己的浏览器。任何共享状态的变化仍然需要成员本人点击确认。日志记录延迟与失败类型，**不记录原文与草稿**。

## 验证方式

在无头浏览器中驱动真实构建产物：

- **成功路径**（打桩接口）：草稿正确填充出席、通勤、预算、确认时间四项，注入的预算行与周围网格样式一致
- **失败路径**（接口不可达）：兜底草稿出现，并提示由浏览器本地生成
- 这两条都有截图留存

## 实现侧的已知缺口

以下问题存在于 choicemesh-mvp，不影响 demo，但会影响未来上线：

1. **`estimated_cost` 从未写入**。数据库有该字段，`room_summary()` 用它计算边界风险，页面也读取它——只有建房与改提案表单不写入。因此实现侧的「边界风险」恒为 0，用户研究中「边界风险应可见但不阻塞」的结论在实现里不成立。
2. 实现侧缺 `join` / `compare` / `coordination` 三个页面。
3. 实现侧视觉停留在 V3 之前的版本。
4. `choicemesh-mvp/README.md` 描述过时，声称使用本地状态，实际后端已接通。

## 变更记录

| 提交 | 内容 |
|---|---|
| 1 | 缺环境变量时渲染配置提示页，修复 `next build` 预渲染崩溃 |
| 2 | React 实现的 `?demo=1` 免登录模式（内存数据层，含 RLS 边界模拟） |
| 3 | AI 链路加固与 37 条评测集 |
| 4 | V3 作为 demo 由 Next.js 同源提供，接真实 AI 接口 |
