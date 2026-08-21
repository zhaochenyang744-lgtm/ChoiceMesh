# ChoiceMesh private-draft extraction — evaluation report

> Status: first baseline only. This report is evidence of one controlled run,
> not a release approval. The 2.7% over-claim result requires prompt revision
> and a repeat evaluation before the capability can meet a production gate.

| Field | Value |
| --- | --- |
| Run at | 2026-08-21 04:40 UTC |
| Model | `deepseek-chat` |
| Prompt version | `parse-details-v1` |
| Cases | 37 x 1 run = 37 |
| Median latency | 1.0s |

## Headline

| Metric | Result | What a failure means |
| --- | --- | --- |
| Schema valid | 100.0% | The app cannot show a draft at all |
| Full case pass | 89.2% | Some field needs correcting before confirming |
| Attendance correct | 89.2% | The member's own status is misread |
| **Over-claim rate** | **2.7%** | **A hedged or negative reply is read as a firm yes** |
| Travel limit correct | 100.0% | A constraint is lost or wrong |
| Budget limit correct | 100.0% | A constraint is lost or wrong |
| Travel invented | 0.0% | A number appears the member never said |
| Budget invented | 0.0% | A number appears the member never said |
| Call errors | 0 of 37 | The endpoint failed outright |

Over-claim is the critical metric: it can look plausible to a member during
review and misrepresent their availability to the group. This baseline has one
over-claim, so it does not meet a zero-over-claim release gate.

## By group

| Group | Runs | Case pass | Attendance | Over-claim |
| --- | --- | --- | --- | --- |
| adversarial | 5 | 100% | 100% | 0 |
| clear | 3 | 100% | 100% | 0 |
| clear-no | 3 | 100% | 100% | 0 |
| deadline | 3 | 100% | 100% | 0 |
| hedged | 6 | 100% | 100% | 0 |
| limits | 7 | 71% | 71% | 0 |
| mixed | 3 | 67% | 67% | 1 |
| no-invention | 3 | 67% | 67% | 0 |
| noise | 4 | 100% | 100% | 0 |

## Attendance confusion

| Expected | Returned | Count |
| --- | --- | --- |
| uncertain | uncertain | 11 |
| attending | attending | 10 |
| not_specified | not_specified | 7 |
| cannot_attend | cannot_attend | 5 |
| attending | uncertain | 2 |
| not_specified | uncertain | 1 |
| uncertain | attending | 1 |

## Failures

- **limits-travel-only** (`limits`) — expected `attending`; returned `uncertain` for: `Happy to come as long as it's within 30 minutes of the CBD.`
- **limits-zh-travel** (`limits`) — expected `not_specified`; returned `uncertain` for: `地铁超过四十分钟我就不去了。`
- **no-numbers-close** (`no-invention`) — expected `attending`; returned `uncertain` for: `Works for me if it's somewhere close by.`
- **mixed-negation** (`mixed`) — expected `uncertain`; returned `attending` for: `It's not that I can't come, it's that I can't come early.` This is the over-claim.

## Next evaluation gate

1. Revise the prompt's handling of scoped negation and conditional attendance.
2. Re-run the full 37-case set; use the same model and prompt-versioned report name.
3. Add a repeated-run stability check before making a release decision.
