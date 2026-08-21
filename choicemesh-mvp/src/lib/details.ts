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
  const attendance = draft.attendance;
  const isNullableNonNegativeNumber = (input: unknown) => input === null || (typeof input === "number" && Number.isFinite(input) && input >= 0);
  return (
    typeof draft.summary === "string" &&
    ["attending", "uncertain", "cannot_attend", "not_specified"].includes(String(attendance)) &&
    isNullableNonNegativeNumber(draft.travel_limit_minutes) &&
    isNullableNonNegativeNumber(draft.budget_limit) &&
    (draft.confirmation_by === null || typeof draft.confirmation_by === "string") &&
    (draft.unparsed_notes === null || typeof draft.unparsed_notes === "string")
  );
}
