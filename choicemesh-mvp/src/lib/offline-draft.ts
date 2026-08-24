import type { DetailDraft } from "./details";

/**
 * Deterministic demo-only fallback. It never confirms a member's details and
 * deliberately marks hedged language as uncertain.
 */
export function offlineDraft(text: string): DetailDraft {
  const lower = text.toLowerCase();
  const travel = lower.match(/(\d{1,3})\s*(minutes|minute|mins|min|分钟)/);
  const budget = lower.match(/[$￥¥]\s*(\d{1,5})|(\d{1,5})\s*(dollars|块|元)/);
  const cannot = /(can't|cannot|can not|won't work|不能|来不了)/.test(lower);
  const maybe = /(probably|should be able|might|maybe|大概|应该|可能)/.test(lower);
  const can = /(i can (?:attend|join|come|make it)|i'm free|i am free|works for me|可以|有空)/.test(lower);
  const scopedConflict = cannot && can;
  const attendance: DetailDraft["attendance"] = maybe || scopedConflict ? "uncertain" : cannot ? "cannot_attend" : can ? "attending" : "not_specified";

  return {
    attendance,
    travel_limit_minutes: travel ? Number(travel[1]) : null,
    budget_limit: budget ? Number(budget[1] || budget[2]) : null,
    confirmation_by: null,
    summary: "Offline draft. The AI service was unavailable, so this is a rough local reading of your reply.",
    unparsed_notes: "Demo fallback: please check every field before confirming."
  };
}
