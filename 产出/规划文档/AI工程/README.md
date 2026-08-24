# ChoiceMesh AI 工程导航

当前能力版本为 `parse-details-v5`，当前数据集为 `parse-details-golden-v1`。AI 只把单个成员的输入整理为本人可编辑的私密草稿，不推荐活动、不确认出席、不改变共享状态。

## 当前文档

1. [能力与产品边界 V2](./01_ChoiceMesh_AI能力与产品边界_V2.md)
2. [AI 接入架构 V1](./02_ChoiceMesh_AI接入架构_V1.md)
3. [提示词与输出契约 parse-details-v5](./03_ChoiceMesh_AI提示词与输出契约_parse-details-v5.md)
4. [评测与安全规范 V2](./04_ChoiceMesh_AI评测与安全规范_V2.md)
5. [演示证据清单 V2](./05_ChoiceMesh_AI演示证据清单_V2.md)
6. [降级流验证记录 V1](./06_ChoiceMesh_AI降级流验证记录_V1.md)
7. [Golden 评测数据集说明 V1](./07_ChoiceMesh_Golden评测数据集说明_V1.md)

## 保留证据

- [v1 37 条冻结基线](./评测报告/ChoiceMesh_AI评测报告_parse-details-v1_20260821.md)
- [v5 × Golden v1 全量报告](./评测报告/ChoiceMesh_AI评测报告_parse-details-v5_golden-v1_20260824.md)

仓库只保留能够说明“起点”和“当前结果”的两份报告；v2–v4 的中间调参快照已删除，关键规则变化已经合并进提示词契约和评测规范，避免同一结论重复出现。

200 条 Golden 合成回归集用于发现提示词回归，不是生产 benchmark。最新模型直出报告仍有 1 条 over-claim；实现层已加入确定性 S0 guard，把“犹豫式肯定”和“多选项范围不明”改回 `uncertain` 再展示，并有固定测试。模型直出与产品管线结果分开记录，不用 guard 掩盖模型缺陷。真实用户样本、双人标注和跨模型比较仍需真实参与者，项目不伪造这类证据。
