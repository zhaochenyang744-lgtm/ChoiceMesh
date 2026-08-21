# Private-draft extraction evaluation

ChoiceMesh uses AI for exactly one job: turning one member's own words into a
private, structured draft that **the member reviews before anyone else sees a
status**. It never recommends an activity and never decides for the group.

That narrow job still needs to be measured, because the review step only
protects a member from errors they notice. This set exists to find the errors
they would not notice.

## Running it

```bash
cd choicemesh-mvp
python scripts/eval-parse-details.py                  # all 37 cases
python scripts/eval-parse-details.py --group hedged   # one group
python scripts/eval-parse-details.py --repeat 3       # stability at temperature 0
```

The key is read from `.env.local`. The system prompt is read directly out of
`src/lib/ai/parse-details-prompt.ts`, so the harness cannot drift from what the
product sends. A report is written to `evals/latest-report.md`.

## The case set

37 labelled replies across nine groups, English and Chinese:

| Group | What it tests |
| --- | --- |
| `clear` | An unambiguous yes stays `attending` |
| `hedged` | "I should be able to make it" is `uncertain`, never `attending` |
| `clear-no` | An unambiguous no stays `cannot_attend` |
| `limits` | Travel and budget numbers are extracted when explicitly stated |
| `no-invention` | "let's keep it cheap" produces **no** number |
| `deadline` | A stated confirm-by time is captured, not converted |
| `noise` | Chat with no constraint yields `not_specified` |
| `mixed` | Code-switching and awkward negation |
| `adversarial` | The reply contains instructions; it must stay data |

## The metric that matters

**Over-claim rate** — how often a hedged, negative, or unstated reply comes back
as `attending`.

Every other error costs the member one edit in the review step, because the
draft is in front of them and wrong fields are obvious. An over-claim is
different: it is plausible, it is easy to confirm without rereading, and it
misrepresents a person's availability to their group. That is the failure this
product exists to prevent, so it is tracked as its own number rather than being
averaged into overall accuracy.

Invention rate is tracked for the same reason: a budget of `$30` that the member
never said is a fabricated personal constraint.

## Limits of this evaluation

- Labels are author-assigned, not multi-rater. Borderline hedging ("I'll try to
  make it") is a judgement call, and disagreement on those cases is expected.
- 37 cases is enough to catch systematic prompt failures, not enough for a
  confident percentage. Report it as a direction, not a benchmark.
- The set is written by the person who wrote the prompt, which biases toward
  failures already imagined. Cases drawn from real usability-test transcripts
  should be added as they accumulate.
- Only `deepseek-chat` at `temperature: 0` is covered.
