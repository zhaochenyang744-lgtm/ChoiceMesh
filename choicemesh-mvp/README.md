# ChoiceMesh MVP

ChoiceMesh helps a group turn private availability details into a clear shared activity decision. Members can write or dictate one natural-language reply; the server sends it to DeepSeek for a private structured draft, and the member must review and confirm it before the group sees only the resulting status.

## What this MVP includes

- Room creation with one starting proposal and participation rule.
- Private natural-language and browser voice input for personal details.
- A server-only DeepSeek integration at `POST /api/parse-details`.
- Member review before details become confirmed.
- Shared, anonymous progress; nobody can read another member’s original reply or constraints.
- Proposal changes that remain pending until supported, then require fresh confirmation.
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

## Privacy boundary

The browser never receives `DEEPSEEK_API_KEY`. The API route sends a member’s reply only to DeepSeek, returns a private draft to that same browser session, and does not make decisions or publish on the member’s behalf.

This first deployable slice deliberately uses local client state for the shared-room demonstration. A production multi-user release needs the next backend milestone: Supabase Auth, Postgres row-level security, room/member tables, and server-enforced support/publish transactions.
