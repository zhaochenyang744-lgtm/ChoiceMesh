import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const core = await readFile(path.join(root, "supabase/migrations/0001_choicemesh_core.sql"), "utf8");
const privileges = await readFile(path.join(root, "supabase/migrations/0003_function_privileges.sql"), "utf8");
const proposalResolution = await readFile(path.join(root, "supabase/migrations/0004_pending_proposal_resolution.sql"), "utf8");

assert.match(core, /create type public\.proposal_status as enum \([^)]*'withdrawn'[^)]*\)/i, "proposal status must include the withdrawal terminal state");

for (const table of ["rooms", "room_members", "proposals", "proposal_supports", "private_details", "published_versions"]) {
  assert.match(core, new RegExp(`alter table public\\.${table} enable row level security`, "i"), `${table}: RLS is not enabled`);
}

assert.match(core, /members can read their own private details[\s\S]*?using \(user_id = auth\.uid\(\)\)/i);
assert.match(core, /members can insert their own private details[\s\S]*?with check \(user_id = auth\.uid\(\) and public\.is_room_member\(room_id\)\)/i);
assert.match(core, /members can update their own private details[\s\S]*?using \(user_id = auth\.uid\(\)\)[\s\S]*?with check \(user_id = auth\.uid\(\)\)/i);
const summaryReturn = core.match(/create or replace function public\.room_summary[\s\S]*?returns table \(([\s\S]*?)\)\s*language/i)?.[1] || "";
assert.doesNotMatch(summaryReturn, /user_id|original_reply|parsed_detail|travel_limit|budget_limit/i);
assert.match(core, /join public\.room_members m on m\.room_id = c\.id[\s\S]*?left join public\.private_details d on d\.room_id = c\.id and d\.user_id = m\.user_id/i, "room_summary must count members without private-detail rows");

for (const fn of ["is_room_member", "create_room", "join_room", "support_proposal", "room_summary", "publish_room"]) {
  assert.match(privileges, new RegExp(`revoke execute on function public\\.${fn}\\(`, "i"), `${fn}: PUBLIC execute is not revoked`);
}

assert.match(proposalResolution, /create or replace function public\.withdraw_proposal/i);
assert.match(proposalResolution, /status = 'withdrawn'[\s\S]*?status = 'pending' and id <> p_proposal_id/i, "supporting one proposal must close competing pending proposals");
assert.match(proposalResolution, /revoke execute on function public\.withdraw_proposal\(uuid\) from public, anon/i);

console.log("PRIVACY_BOUNDARY_STATIC_OK rls=6 owner-only-private-details member-complete-summary proposal-resolution explicit-rpc-grants");
