import assert from "node:assert/strict";
import test from "node:test";

import { supportPendingProposal, withdrawPendingProposal } from "../src/lib/proposal-resolution.ts";

const roomId = "room-1";
const proposals = () => [
  { id: "current", room_id: roomId, status: "current", created_by: "creator" },
  { id: "supported", room_id: roomId, status: "pending", created_by: "member-a" },
  { id: "competing", room_id: roomId, status: "pending", created_by: "member-b" }
];

test("a proposer can withdraw their own pending change", () => {
  const rows = proposals();
  const result = withdrawPendingProposal(rows, "competing", "member-b");
  assert.equal(result.error, null);
  assert.equal(rows.find((row) => row.id === "competing").status, "withdrawn");
});

test("supporting one change closes every competing pending change", () => {
  const rows = proposals();
  const result = supportPendingProposal(rows, "supported", "supporter");
  assert.equal(result.error, null);
  assert.equal(rows.find((row) => row.id === "supported").status, "current");
  assert.equal(rows.find((row) => row.id === "current").status, "superseded");
  assert.equal(rows.filter((row) => row.status === "pending").length, 0);
  assert.equal(rows.find((row) => row.id === "competing").status, "withdrawn");
});

test("proposal ownership is enforced", () => {
  const rows = proposals();
  assert.match(supportPendingProposal(rows, "supported", "member-a").error, /cannot support/i);
  assert.match(withdrawPendingProposal(rows, "competing", "member-a").error, /only the proposer/i);
});
