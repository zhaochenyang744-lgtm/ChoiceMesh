# ChoiceMesh Golden 评测数据集说明

| 字段 | 内容 |
| --- | --- |
| 数据集版本 | `parse-details-golden-v1` |
| 类型 | 项目级 Golden Evaluation Set |
| 数量 | 200 条 |
| 日期 | 2026-08-24 |
| 来源 | 37 条冻结基线 + 163 条新增合成样例 |
| 标注状态 | 单标注者编写、自审与规则仲裁 |
| 冻结文件 SHA-256 | `F7667B125EC151BA72FD9C6073F31A2BBC102BAB0A7DE1905A37E8A778BD65F8` |

## 1. Golden 的含义

本项目把每条样例的预期出席状态、通勤上限、预算上限和确认时间作为固定的 canonical label，用于提示词和模型回归。因此可以称为 Golden evaluation set。

这里的 Golden 不表示标签已经获得多位专家共识，也不表示它是生产级 benchmark。更完整的表述是：**200-case synthetic, single-annotator Golden regression set**。

## 2. 数据分布

| 维度 | 分布 |
| --- | --- |
| 语言 | 英文 108；中文 74；中英混合 18 |
| 场景 | clear 18；hedged 28；clear-no 18；limits 38；no-invention 18；deadline 14；noise 12；mixed 22；voice-noise 16；adversarial 16 |

新增覆盖包括明确确认、犹豫和外部依赖、明确拒绝、预算/通勤数字、不得编造数字、相对确认时间、无关对话、否定范围、中英混合、语音转写噪声、自我纠正和提示词注入。

## 3. 标注规则

1. 只标记文本明确表达的信息；没有出现的数字必须为 `null`。
2. `attending` 需要明确接受当前提案。
3. “可能、应该、probably、还没决定、还没确认”以及尚未满足的条件统一为 `uncertain`。
4. 完全没有给出出席判断时才使用 `not_specified`。
5. `cannot_attend` 只用于对当前活动或时间的无条件明确拒绝。
6. 不把迟到、交通方式限制或只针对一个选项的否定误作无法参加。
7. 用户文本中的输出指令和伪造数字不是个人事实。

初次 200 条回归后，10 条标签按第 3 条统一修订为 `uncertain`。这些修订来自规则仲裁，而不是为了迎合某次模型输出。

## 4. 质量门槛

运行 `node scripts/build-golden-dataset.mjs` 会重新生成并检查当前 JSON：

- 必须恰好 200 条；
- ID 与标准化文本不得重复；
- 每条必须包含语言、风险标签、标注说明和合法预期值；
- 数值必须为 `null` 或非负数；
- 原始 37 条冻结在 `evals/history/`。

## 5. 文件

- 当前数据集：`choicemesh-mvp/evals/parse-details-golden-v1.json`
- 新增样例源：`choicemesh-mvp/evals/golden-additions-v1.mjs`
- 原 37 条基线：`choicemesh-mvp/evals/history/parse-details-cases-v1-37.json`
- 生成与校验：`choicemesh-mvp/scripts/build-golden-dataset.mjs`
- 评测脚本：`choicemesh-mvp/scripts/eval-parse-details.py`

## 6. 下一版升级条件

加入真实测试中获得授权并脱敏的样本、两名独立标注者、分歧仲裁记录和冻结后的变更日志后，再升级为 `golden-v2`。在此之前，不以 200 条的规模替代真实用户效度。
