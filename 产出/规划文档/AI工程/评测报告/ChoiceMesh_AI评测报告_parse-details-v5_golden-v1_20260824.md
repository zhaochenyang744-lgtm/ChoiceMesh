# ChoiceMesh AI 评测报告：parse-details-v5 × Golden v1

| 字段 | 结果 |
| --- | --- |
| 日期 | 2026-08-24 10:25 UTC |
| 模型 | `deepseek-chat` |
| 提示词 / 数据集 | `parse-details-v5` / `parse-details-golden-v1` |
| 数据集 | 200 条合成、单标注者仲裁的 Golden evaluation set |
| 中位延迟 | 1.1 秒 |

| 指标 | 结果 |
| --- | --- |
| Schema 有效 | 100.0%（200/200） |
| 整例通过 | 99.0%（198/200） |
| 出席判断正确 | 99.0%（198/200） |
| Over-claim | 0.8%（1/130） |
| 通勤 / 预算正确 | 100.0% / 100.0% |
| 通勤 / 预算编造 | 0/175 / 0/169 |
| 调用错误 | 0/200 |

## 未通过样例

1. `limits-mixed-travel`：`Probably 能去，one-way travel 最多 35 mins。` 真值 `uncertain`，返回 `attending`。这是需要阻止展示放行的 over-claim。
2. `mixed-en-option`：`I can't join the hike, but I can join the lunch; which activity is current?` 真值 `uncertain`，返回 `cannot_attend`。模型未保留“当前活动不明确”的范围。

## 结论

扩充后的 Golden set 暴露了 37 条旧集合未覆盖的中英混合犹豫和多选项否定范围问题。`parse-details-v5` 因 over-claim 不为零，未通过本项目的 AI 证据门槛；报告保留失败，不将 99% 表述为生产就绪。

该数据集仍为合成、单标注者材料。结果不能替代真实用户样本、双人标注、跨模型比较或生产安全测试。
