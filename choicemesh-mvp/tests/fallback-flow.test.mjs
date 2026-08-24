import assert from "node:assert/strict";
import test from "node:test";

import { applyAttendanceSafetyGuard, isDetailDraft } from "../src/lib/details.ts";
import { offlineDraft } from "../src/lib/offline-draft.ts";

test("manual fallback keeps hedged attendance uncertain and extracts explicit limits", () => {
  const draft = offlineDraft("I should be able to make it, under $50 and within 45 minutes.");
  assert.equal(draft.attendance, "uncertain");
  assert.equal(draft.budget_limit, 50);
  assert.equal(draft.travel_limit_minutes, 45);
  assert.equal(isDetailDraft(draft), true);
});

test("manual fallback does not invent numbers", () => {
  const draft = offlineDraft("Sounds good, but please keep it cheap and nearby.");
  assert.equal(draft.attendance, "not_specified");
  assert.equal(draft.budget_limit, null);
  assert.equal(draft.travel_limit_minutes, null);
});

test("manual fallback preserves clear attendance and refusal", () => {
  assert.equal(offlineDraft("I can attend.").attendance, "attending");
  assert.equal(offlineDraft("I cannot attend.").attendance, "cannot_attend");
});

test("manual fallback preserves mixed-option scope", () => {
  const draft = offlineDraft("I can't join the hike, but I can join the lunch; which activity is current?");
  assert.equal(draft.attendance, "uncertain");
});

test("AI draft validation rejects extra fields and oversized text", () => {
  const valid = {
    attendance: "uncertain",
    travel_limit_minutes: null,
    budget_limit: 50,
    confirmation_by: null,
    summary: "The member may attend and has a budget limit.",
    unparsed_notes: null
  };
  assert.equal(isDetailDraft(valid), true);
  assert.equal(isDetailDraft({ ...valid, member_name: "private" }), false);
  assert.equal(isDetailDraft({ ...valid, summary: "x".repeat(241) }), false);
});

test("S0 guard blocks the two known model over-claim families", () => {
  const attendingDraft = {
    attendance: "attending",
    travel_limit_minutes: 35,
    budget_limit: null,
    confirmation_by: null,
    summary: "The member can attend.",
    unparsed_notes: null
  };
  assert.equal(applyAttendanceSafetyGuard("Probably 能去，one-way travel 最多 35 mins。", attendingDraft).attendance, "uncertain");
  assert.equal(applyAttendanceSafetyGuard("I can't join the hike, but I can join the lunch; which activity is current?", attendingDraft).attendance, "uncertain");
  assert.equal(applyAttendanceSafetyGuard("I can attend, but probably arrive late.", attendingDraft).attendance, "attending");
});
