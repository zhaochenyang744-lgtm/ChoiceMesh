#!/usr/bin/env python3
"""Evaluate the ChoiceMesh private-draft extraction against a labelled set.

Run from the choicemesh-mvp directory:

    python scripts/eval-parse-details.py                  # full set
    python scripts/eval-parse-details.py --group hedged   # one group
    python scripts/eval-parse-details.py --repeat 3       # stability check

The DeepSeek key is read from .env.local (or the environment). The system
prompt is read out of src/lib/ai/parse-details-prompt.ts so this harness can
never drift from what the product actually sends.

What is measured
----------------
attendance          the field a wrong answer would damage most: marking a
                    hedged reply as "attending" silently misrepresents a person
                    to their group
travel / budget     extraction accuracy AND invention rate (a value produced
                    where the reply stated none)
adversarial         whether a reply that contains instructions is still treated
                    as data

The report is written to a markdown file for the project's test records.
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROMPT_FILE = ROOT / "src" / "lib" / "ai" / "parse-details-prompt.ts"
DEFAULT_CASES_FILE = ROOT / "evals" / "parse-details-golden-v1.json"
API_URL = "https://api.deepseek.com/chat/completions"


def load_env():
    env_path = ROOT / ".env.local"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip())


def load_prompt() -> tuple[str, str]:
    source = PROMPT_FILE.read_text(encoding="utf-8")
    version_match = re.search(r'PARSE_DETAILS_PROMPT_VERSION\s*=\s*"([^"]+)"', source)
    prompt_match = re.search(r"parseDetailsSystemPrompt\s*=\s*`(.*?)`;", source, re.S)
    if not version_match or not prompt_match:
        sys.exit(f"Could not read the system prompt from {PROMPT_FILE}")
    prompt = prompt_match.group(1).replace("\\`", "`").replace("\\$", "$")
    return version_match.group(1), prompt


def call_model(api_key: str, prompt: str, text: str, model: str, timeout: int = 30):
    body = json.dumps({
        "model": model,
        "temperature": 0,
        "max_tokens": 380,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": prompt},
            {"role": "user", "content": f"Extract private details from this reply:\n{text}"},
        ],
    }).encode("utf-8")
    request = urllib.request.Request(
        API_URL,
        data=body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
    )
    started = time.time()
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as error:
        return None, f"http_{error.code}", time.time() - started
    except Exception as error:  # noqa: BLE001 - the harness reports, it does not crash
        return None, type(error).__name__, time.time() - started

    content = (payload.get("choices") or [{}])[0].get("message", {}).get("content")
    if not content:
        return None, "empty_response", time.time() - started
    try:
        return json.loads(content), None, time.time() - started
    except json.JSONDecodeError:
        return None, "invalid_json", time.time() - started


REQUIRED_KEYS = {"attendance", "travel_limit_minutes", "budget_limit", "confirmation_by", "summary", "unparsed_notes"}
VALID_ATTENDANCE = {"attending", "uncertain", "cannot_attend", "not_specified"}


def schema_ok(draft) -> bool:
    if not isinstance(draft, dict) or set(draft) != REQUIRED_KEYS:
        return False
    if draft["attendance"] not in VALID_ATTENDANCE:
        return False
    for key in ("travel_limit_minutes", "budget_limit"):
        value = draft[key]
        if value is not None and not (isinstance(value, (int, float)) and value >= 0):
            return False
    return isinstance(draft["summary"], str)


def evaluate(case, draft):
    """Return per-field outcomes for one case."""
    expect = case["expect"]
    out = {}
    out["schema"] = schema_ok(draft)
    if not out["schema"]:
        return out

    out["attendance"] = draft["attendance"] == expect["attendance"]
    out["attendance_got"] = draft["attendance"]

    # A hedged reply scored as "attending" is the failure that actually harms
    # someone, so it is counted separately from ordinary mislabelling.
    out["overclaim"] = expect["attendance"] in {"uncertain", "not_specified", "cannot_attend"} and draft["attendance"] == "attending"

    for field in ("travel_limit_minutes", "budget_limit"):
        expected = expect.get(field)
        got = draft.get(field)
        out[field] = (expected is None and got is None) or (
            expected is not None and got is not None and abs(float(got) - float(expected)) < 0.01
        )
        out[f"{field}_invented"] = expected is None and got is not None

    if expect.get("confirmation_by_present"):
        out["confirmation_by"] = bool(draft.get("confirmation_by"))
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--group", help="only run one group")
    parser.add_argument("--case", action="append", dest="case_ids", help="run one case id; may be repeated")
    parser.add_argument("--repeat", type=int, default=1, help="runs per case")
    parser.add_argument("--model", default=os.environ.get("DEEPSEEK_MODEL", "deepseek-chat"))
    parser.add_argument("--cases", default=str(DEFAULT_CASES_FILE), help="labelled dataset JSON")
    parser.add_argument("--out", default=str(ROOT / "evals" / "latest-report.md"))
    args = parser.parse_args()

    load_env()
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        sys.exit("DEEPSEEK_API_KEY is not set. Put it in .env.local or the environment.")

    prompt_version, prompt = load_prompt()
    cases_file = Path(args.cases)
    data = json.loads(cases_file.read_text(encoding="utf-8"))
    case_set_version = data.get("case_set_version", "unversioned")
    dataset_type = data.get("dataset_type", "evaluation_set")
    label_status = data.get("label_status", "not recorded")
    cases = [
        c for c in data["cases"]
        if (not args.group or c["group"] == args.group)
        and (not args.case_ids or c["id"] in set(args.case_ids))
    ]
    if not cases:
        sys.exit(f"No cases in group {args.group!r}")

    totals = Counter()
    by_group = defaultdict(Counter)
    failures = []
    confusion = Counter()
    latencies = []

    print(f"{len(cases)} cases x {args.repeat} run(s) against {args.model}\n")

    for case in cases:
        for run in range(args.repeat):
            draft, error, latency = call_model(api_key, prompt, case["text"], args.model)
            latencies.append(latency)
            group = case["group"]
            totals["runs"] += 1
            by_group[group]["runs"] += 1

            if error:
                totals["errors"] += 1
                failures.append((case, f"call failed: {error}", None))
                print(f"  ERROR {case['id']}: {error}")
                continue

            result = evaluate(case, draft)
            if not result["schema"]:
                totals["schema_fail"] += 1
                failures.append((case, "schema violation", draft))
                print(f"  SCHEMA {case['id']}")
                continue

            totals["schema_ok"] += 1
            confusion[(case["expect"]["attendance"], result["attendance_got"])] += 1

            if case["expect"]["attendance"] != "attending":
                totals["overclaim_eligible"] += 1
                by_group[group]["overclaim_eligible"] += 1

            for field in ("attendance", "travel_limit_minutes", "budget_limit"):
                if result[field]:
                    totals[field] += 1
                    by_group[group][field] += 1
            if result.get("overclaim"):
                totals["overclaim"] += 1
                by_group[group]["overclaim"] += 1
            for field in ("travel_limit_minutes", "budget_limit"):
                if case["expect"].get(field) is None:
                    totals[f"{field}_invention_eligible"] += 1
                if result[f"{field}_invented"]:
                    totals[f"{field}_invented"] += 1
            if "confirmation_by" in result:
                totals["confirmation_by_runs"] += 1
                if result["confirmation_by"]:
                    totals["confirmation_by"] += 1

            scored_fields = ["attendance", "travel_limit_minutes", "budget_limit"]
            if "confirmation_by" in result:
                scored_fields.append("confirmation_by")
            passed = all(result[field] for field in scored_fields)
            if passed:
                totals["case_pass"] += 1
                by_group[group]["case_pass"] += 1
            else:
                wrong = [field for field in scored_fields if not result[field]]
                failures.append((case, "wrong: " + ", ".join(wrong), draft))
            print(f"  {'PASS' if passed else 'FAIL'} {case['id']:<28} {latency:.1f}s")

    runs = totals["runs"] or 1
    scored = totals["schema_ok"] or 1

    def pct(n, denominator):
        return "n/a" if denominator == 0 else f"{100.0 * n / denominator:.1f}%"

    lines = [
        "# ChoiceMesh private-draft extraction — evaluation report",
        "",
        f"| Field | Value |",
        f"| --- | --- |",
        f"| Run at | {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} |",
        f"| Model | `{args.model}` |",
        f"| Prompt version | `{prompt_version}` |",
        f"| Dataset type | `{dataset_type}` |",
        f"| Case-set version | `{case_set_version}` |",
        f"| Label status | {label_status} |",
        f"| Cases | {len(cases)} x {args.repeat} run(s) = {runs} |",
        f"| Median latency | {sorted(latencies)[len(latencies)//2]:.1f}s |",
        "",
        "## Headline",
        "",
        "| Metric | Result | What a failure means |",
        "| --- | --- | --- |",
        f"| Schema valid | {pct(totals['schema_ok'], runs)} | The app cannot show a draft at all |",
        f"| Full case pass | {pct(totals['case_pass'], scored)} | Some scored field needs correcting before confirming |",
        f"| Attendance correct | {pct(totals['attendance'], scored)} | The member's own status is misread |",
        f"| **Over-claim rate** | **{pct(totals['overclaim'], totals['overclaim_eligible'])} ({totals['overclaim']}/{totals['overclaim_eligible']})** | **A non-attending label is returned as a firm yes** |",
        f"| Travel limit correct | {pct(totals['travel_limit_minutes'], scored)} | A constraint is lost or wrong |",
        f"| Budget limit correct | {pct(totals['budget_limit'], scored)} | A constraint is lost or wrong |",
        f"| Travel invented | {pct(totals['travel_limit_minutes_invented'], totals['travel_limit_minutes_invention_eligible'])} ({totals['travel_limit_minutes_invented']}/{totals['travel_limit_minutes_invention_eligible']}) | A number appears where the member stated none |",
        f"| Budget invented | {pct(totals['budget_limit_invented'], totals['budget_limit_invention_eligible'])} ({totals['budget_limit_invented']}/{totals['budget_limit_invention_eligible']}) | A number appears where the member stated none |",
        f"| Call errors | {totals['errors']} of {runs} | The endpoint failed outright |",
        "",
        "Over-claim is the metric that matters most. Every other error is visible to",
        "the member in the review step and costs them an edit. An over-claim is the",
        "one error that reads as plausible, gets confirmed, and misrepresents a",
        "person to their group.",
        "",
        "## By group",
        "",
        "| Group | Runs | Case pass | Attendance | Over-claim |",
        "| --- | --- | --- | --- | --- |",
    ]
    for group, counts in sorted(by_group.items()):
        n = counts["runs"]
        lines.append(
            f"| {group} | {n} | {100.0*counts['case_pass']/n:.0f}% | "
            f"{100.0*counts['attendance']/n:.0f}% | {counts['overclaim']}/{counts['overclaim_eligible']} |"
        )

    lines += ["", "## Attendance confusion", "", "| Expected | Returned | Count |", "| --- | --- | --- |"]
    for (expected, got), count in sorted(confusion.items(), key=lambda kv: -kv[1]):
        mark = "" if expected == got else "  ←"
        lines.append(f"| {expected} | {got}{mark} | {count} |")

    lines += ["", "## Failures", ""]
    if not failures:
        lines.append("None.")
    else:
        for case, reason, draft in failures:
            lines.append(f"- **{case['id']}** ({case['group']}) — {reason}")
            lines.append(f"  - reply: `{case['text']}`")
            lines.append(f"  - expected: `{json.dumps(case['expect'], ensure_ascii=False)}`")
            if draft is not None:
                lines.append(f"  - returned: `{json.dumps(draft, ensure_ascii=False)}`")

    report = "\n".join(lines) + "\n"
    Path(args.out).write_text(report, encoding="utf-8")

    print(f"\nschema valid {pct(totals['schema_ok'], runs)} · case pass {pct(totals['case_pass'], scored)} · "
          f"attendance {pct(totals['attendance'], scored)} · "
          f"over-claim {pct(totals['overclaim'], totals['overclaim_eligible'])}")
    print(f"report written to {args.out}")


if __name__ == "__main__":
    main()
