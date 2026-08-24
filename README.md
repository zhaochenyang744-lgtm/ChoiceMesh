# ChoiceMesh

ChoiceMesh helps a group turn private availability, budget, travel, and preference information into a clear shared activity decision.

The product protects personal details: people confirm their own constraints privately; the shared workspace shows only anonymous progress, feasibility, and decisions the group needs to make.

## Project status

ChoiceMesh is a personal AI product-management portfolio project. It is not planned as a production service. The goal is to make the product reasoning, AI boundary, evaluation method, failure handling and privacy-aware backend PoC inspectable without claiming real-world scale or production readiness.

## Current product definition

The current product baseline is documented in the V2 set below. Earlier V1 research and design files remain in the repository as historical evidence, but are not the current implementation contract.

- [Document version index](./产出/规划文档/Spec文档/00_ChoiceMesh_文档版本索引_V2.md)
- [Project brief V2](./产出/规划文档/Spec文档/01_ChoiceMesh_项目Brief_V2.md)
- [MVP product and flow specification V2](./产出/规划文档/Spec文档/02_ChoiceMesh_MVP产品与流程规格_V2.md)
- [PRD V2](./产出/规划文档/Spec文档/03_ChoiceMesh_产品需求文档_PRD_V2.md)
- [AI capability and product boundary V2](./产出/规划文档/AI工程/01_ChoiceMesh_AI能力与产品边界_V2.md)
- [Success metrics and evaluation framework V2](./产出/规划文档/Spec文档/04_ChoiceMesh_成功指标与评测框架_V2.md)

ChoiceMesh currently coordinates one shared proposal. AI only turns an individual member's natural-language or voice-transcribed input into a private draft for review; it does not recommend activities or make group decisions.

## Live prototype

The current high-fidelity prototype lives at:

[`产出/交付物/产品原型/06_ChoiceMesh_高保真原型_V3/index.html`](./产出/交付物/产品原型/06_ChoiceMesh_高保真原型_V3/index.html)

GitHub Pages deploys this directory only. The prototype is intentionally frontend-only at this stage.

## Repository layout

| Path | Purpose | Published? |
| --- | --- | --- |
| `产出/` | Product brief, research synthesis, requirements, test plans, design documents, milestones, and every prototype iteration | Yes |
| `产出/交付物/产品原型/06_ChoiceMesh_高保真原型_V3/` | Current interactive high-fidelity prototype, deployed to GitHub Pages | Yes |
| `_系统/` | Project navigation and file-versioning rules | Yes |
| `choicemesh-mvp/` | Next.js implementation in progress; kept for later backend work | Source only |
| `.github/workflows/deploy-prototype.yml` | Deploys the static V3 prototype to GitHub Pages | Yes |
| `参考资料/` | Raw research records and participant materials | Local only |
| `归档/` | Retired directions and unrelated historical work | Local only |

## Run the prototype locally

Open the V3 `index.html` file directly in a browser. It is a self-contained static prototype and does not require a server.

## Evidence map

- AI regression: [`parse-details-v5 × Golden v1` report](./产出/规划文档/AI工程/评测报告/ChoiceMesh_AI评测报告_parse-details-v5_golden-v1_20260824.md) — model-direct output passed 198/200; the product pipeline adds a tested deterministic S0 guard for the two known ambiguity families without rewriting the raw model result.
- AI failure handling: [fallback verification](./产出/规划文档/AI工程/06_ChoiceMesh_AI降级流验证记录_V1.md) — manual entry, timeout, upstream error and invalid JSON.
- Privacy/backend PoC: [evidence and limitations](./产出/规划文档/技术验证/05_ChoiceMesh_隐私与后端PoC证据_V1.md) — owner-only RLS, anonymous summary and explicit RPC grants; no production security claim.
- User evidence still to collect: [small-group comparison pack](./产出/规划文档/测试与评测/04_ChoiceMesh_V2小组对照测试执行包_V1.md) and [event/funnel template](./产出/规划文档/测试与评测/05_ChoiceMesh_V2事件字典与漏斗模板_V1.md).

## Implementation PoC

`choicemesh-mvp/` is separate from the public static prototype. It contains a local implementation PoC for:

- Supabase authentication and room data;
- privacy-preserving member details;
- DeepSeek-assisted private draft extraction;
- proposal support and publishing rules;
- deterministic manual and failure fallback tests;
- static checks for the intended privacy boundary.

Its `.env.local` file is deliberately ignored. Never commit API keys, Supabase service keys, or participant data.

## What is intentionally not public

This public repository excludes raw interview transcripts, participant records, personal notes, generated dependencies, build output, and all local environment files. The public `产出/` folder contains the synthesized process documentation instead.

## Deployment

Pushing changes to `main` triggers the GitHub Pages workflow for the V3 prototype. This deployment demonstrates the interaction design only; it does not prove the Next.js, Supabase or private-data PoC is production-ready.
