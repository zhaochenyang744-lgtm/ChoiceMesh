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
node scripts/build-golden-dataset.mjs                 # regenerate + validate 200 cases
python scripts/eval-parse-details.py                  # all 200 cases
python scripts/eval-parse-details.py --group hedged   # one group
python scripts/eval-parse-details.py --repeat 3       # stability at temperature 0
```

The key is read from `.env.local`. The prompt and its version are read directly
out of `src/lib/ai/parse-details-prompt.ts`, while the labelled dataset carries
its own case-set version. This prevents a report from presenting the dataset
version as though it were the running prompt version. A report is written to
`evals/latest-report.md`.

## The Golden evaluation set

`parse-details-golden-v1.json` is the project-canonical Golden set: 200 labelled synthetic replies across ten groups. It contains the frozen original 37-case baseline plus 163 curated additions. “Golden” means the expected outputs are the canonical regression labels for this project; it does not mean the labels have independent expert consensus.

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
| `voice-noise` | Fillers, missing punctuation, self-correction and inaudible markers |
| `adversarial` | The reply contains instructions; it must stay data |

Every case has a unique ID, language, risk tags, annotation note and expected attendance/travel/budget values. `build-golden-dataset.mjs` rejects duplicate IDs/text, invalid labels, missing annotations, negative values or any count other than exactly 200. The former 37-case file is frozen under `evals/history/`.

## The metric that matters

**Over-claim rate** — among replies labelled hedged, negative, or unstated, how
often the model returns `attending`. The denominator excludes replies already
labelled `attending`; dividing by every case would understate this risk.

Every other error costs the member one edit in the review step, because the
draft is in front of them and wrong fields are obvious. An over-claim is
different: it is plausible, it is easy to confirm without rereading, and it
misrepresents a person's availability to their group. That is the failure this
product exists to prevent, so it is tracked as its own number rather than being
averaged into overall accuracy.

Invention rate is tracked for the same reason: a budget of `$30` that the member
never said is a fabricated personal constraint.

## Limits of this evaluation

- Labels are author-assigned and self-reviewed, not multi-rater. Borderline hedging ("I'll try to
  make it") is a judgement call, and disagreement on those cases is expected.
- 200 cases offer broader regression coverage, but synthetic volume alone does
  not make this a production benchmark. Always report raw counts and provenance.
- The set is written by the person who wrote the prompt, which biases toward
  failures already imagined. Cases drawn from real usability-test transcripts
  should be added as they accumulate.
- Only `deepseek-chat` at `temperature: 0` is covered.
