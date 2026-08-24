# ChoiceMesh MVP

ChoiceMesh helps a group turn private availability details into a clear shared activity decision. Members can write or dictate one natural-language reply; the server sends it to DeepSeek for a private structured draft, and the member must review and confirm it before the group sees only the resulting status.

## What this MVP includes

- Room creation with one starting proposal and participation rule.
- Private natural-language and browser voice input for personal details.
- A server-only DeepSeek integration at `POST /api/parse-details`.
- A deterministic S0 guard that changes known hedged or option-scoped affirmative over-claims back to `uncertain` before display.
- Member review before details become confirmed.
- A complete manual-entry path when AI is skipped or unavailable.
- Shared, anonymous progress; nobody can read another member’s original reply or constraints.
- Proposal changes that remain pending until supported or withdrawn. Supporting one change closes competing pending changes and requires fresh confirmation.
- A Publish gate: members may open it after confirming their own details; it publishes only after the group rule is satisfied.

## Run locally

1. Copy `.env.example` to `.env.local` if it does not already exist.
2. Set `DEEPSEEK_API_KEY` in `.env.local`. This file is ignored by Git—never commit or paste the key.
3. With the bundled runtime available in Codex, install and run:

   ```powershell
   $nodeDir = 'C:\Users\赵晨阳\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin'
   $env:Path = "$nodeDir;$env:Path"
   & 'C:\Users\赵晨阳\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' install
   & 'C:\Users\赵晨阳\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' dev
   ```

Then open [http://localhost:3000](http://localhost:3000).

## Evaluation and local checks

```powershell
node scripts/build-golden-dataset.mjs --check
python scripts/eval-parse-details.py
npm run check
```

`npm run check` runs TypeScript checking, deterministic fallback and proposal-resolution tests, privacy/schema checks, Golden dataset integrity, documentation-link checks, and a production build. The retained model reports live under `../产出/规划文档/AI工程/评测报告/`; only the frozen baseline and the current Golden result are kept.

## Privacy boundary

The browser never receives `DEEPSEEK_API_KEY`. The API route sends a member’s reply only to DeepSeek, returns a private draft to that same browser session, and does not make decisions or publish on the member’s behalf.

Demo mode uses an in-memory client and stores nothing. The Supabase migrations provide an inspectable backend PoC with Auth-oriented ownership rules, RLS, anonymous room summaries and server-enforced support/publish transactions.

This remains a personal portfolio project. Static migration checks and deterministic tests provide inspectable implementation evidence, but do not replace two-account testing against a configured Supabase project or independent human annotation of the AI dataset.
