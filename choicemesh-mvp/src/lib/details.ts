export type DetailDraft = {
  attendance: "attending" | "uncertain" | "cannot_attend" | "not_specified";
  travel_limit_minutes: number | null;
  budget_limit: number | null;
  confirmation_by: string | null;
  summary: string;
  unparsed_notes: string | null;
};

export const emptyDraft: DetailDraft = {
  attendance: "not_specified",
  travel_limit_minutes: null,
  budget_limit: null,
  confirmation_by: null,
  summary: "No attendance decision identified.",
  unparsed_notes: null
};

export function isDetailDraft(value: unknown): value is DetailDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  const requiredKeys = ["attendance", "travel_limit_minutes", "budget_limit", "confirmation_by", "summary", "unparsed_notes"].sort();
  const actualKeys = Object.keys(draft).sort();
  if (actualKeys.length !== requiredKeys.length || requiredKeys.some((key, index) => key !== actualKeys[index])) return false;
  const attendance = draft.attendance;
  const isNullableNonNegativeNumber = (input: unknown) => input === null || (typeof input === "number" && Number.isFinite(input) && input >= 0);
  return (
    typeof draft.summary === "string" && draft.summary.trim().length > 0 && draft.summary.length <= 240 &&
    ["attending", "uncertain", "cannot_attend", "not_specified"].includes(String(attendance)) &&
    isNullableNonNegativeNumber(draft.travel_limit_minutes) &&
    isNullableNonNegativeNumber(draft.budget_limit) &&
    (draft.confirmation_by === null || (typeof draft.confirmation_by === "string" && draft.confirmation_by.length <= 160)) &&
    (draft.unparsed_notes === null || (typeof draft.unparsed_notes === "string" && draft.unparsed_notes.length <= 500))
  );
}

/** Prevent known ambiguity patterns from reaching the review UI as a positive claim. */
export function applyAttendanceSafetyGuard(text: string, draft: DetailDraft): DetailDraft {
  if (draft.attendance !== "attending") return draft;
  const normalized = text.toLowerCase();
  const hedgedAttendance = /(?:\b(?:probably|maybe|might|should be able)\b|大概|应该|可能)[^.!?。！？]{0,28}(?:\b(?:attend|join|come|make it|go)\b|能去|参加|到场)/i.test(normalized);
  const mixedOptionScope = /\b(?:can't|cannot|can not)\s+(?:join|attend)\b[^.!?]{0,100}\bbut\b[^.!?]{0,60}\bcan\s+(?:join|attend)\b/i.test(normalized);
  if (!hedgedAttendance && !mixedOptionScope) return draft;
  return {
    ...draft,
    attendance: "uncertain",
    summary: "Attendance is ambiguous and must be confirmed by the member.",
    unparsed_notes: draft.unparsed_notes ?? "Safety guard: hedged or option-scoped attendance language needs review."
  };
}
