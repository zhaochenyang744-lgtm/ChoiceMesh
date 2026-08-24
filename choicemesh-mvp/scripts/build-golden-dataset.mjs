import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { additions } from "../evals/golden-additions-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const legacyPath = path.join(root, "evals/history/parse-details-cases-v1-37.json");
const outputPath = path.join(root, "evals/parse-details-golden-v1.json");
const legacy = JSON.parse(await readFile(legacyPath, "utf8"));

const groupTags = {
  clear: ["explicit_acceptance"],
  hedged: ["hedging"],
  "clear-no": ["explicit_refusal"],
  limits: ["constraint_extraction"],
  "no-invention": ["no_numeric_invention"],
  deadline: ["confirmation_deadline"],
  noise: ["irrelevant_input"],
  mixed: ["code_switching_or_scoped_negation"],
  adversarial: ["prompt_injection"]
};

function inferLanguage(text) {
  const hasHan = /[\u3400-\u9fff]/u.test(text);
  const hasLatinWord = /[A-Za-z]{2,}/.test(text);
  return hasHan && hasLatinWord ? "mixed" : hasHan ? "zh" : "en";
}

const legacyCases = legacy.cases.map((item) => ({
  ...item,
  language: inferLanguage(item.text),
  risk_tags: groupTags[item.group] || ["legacy_regression"],
  annotation_note: "Canonical label preserved from the executed 37-case v1 regression baseline.",
  provenance: "legacy-v1"
}));

const cases = [...legacyCases, ...additions.map((item) => ({ ...item, provenance: "synthetic-curated-v1" }))];

assert.equal(legacyCases.length, 37, "The frozen v1 baseline must contain 37 cases");
assert.equal(additions.length, 163, "Golden v1 must add exactly 163 cases");
assert.equal(cases.length, 200, "Golden v1 must contain exactly 200 cases");

const ids = new Set();
const texts = new Set();
const validAttendance = new Set(["attending", "uncertain", "cannot_attend", "not_specified"]);
for (const item of cases) {
  assert.match(item.id, /^[a-z0-9-]+$/, `${item.id}: invalid id`);
  assert(!ids.has(item.id), `${item.id}: duplicate id`);
  ids.add(item.id);
  const normalizedText = item.text.trim().toLocaleLowerCase();
  assert(!texts.has(normalizedText), `${item.id}: duplicate text`);
  texts.add(normalizedText);
  assert(["en", "zh", "mixed"].includes(item.language), `${item.id}: invalid language`);
  assert(item.text.trim().length > 0, `${item.id}: empty text`);
  assert(Array.isArray(item.risk_tags) && item.risk_tags.length > 0, `${item.id}: missing risk tags`);
  assert(item.annotation_note?.trim(), `${item.id}: missing annotation note`);
  assert(validAttendance.has(item.expect?.attendance), `${item.id}: invalid attendance label`);
  for (const field of ["travel_limit_minutes", "budget_limit"]) {
    const value = item.expect[field];
    assert(value === null || (typeof value === "number" && value >= 0), `${item.id}: invalid ${field}`);
  }
  if ("confirmation_by_present" in item.expect) {
    assert.equal(item.expect.confirmation_by_present, true, `${item.id}: confirmation flag must be true or omitted`);
  }
}

const countBy = (field) => Object.fromEntries([...new Set(cases.map((item) => item[field]))].sort().map((value) => [value, cases.filter((item) => item[field] === value).length]));
const dataset = {
  dataset_type: "golden_evaluation_set",
  dataset_version: "parse-details-golden-v1",
  case_set_version: "parse-details-golden-v1",
  created_at: "2026-08-24",
  task: "ChoiceMesh member-private detail extraction",
  label_status: "project-canonical, synthetic, single-annotator adjudicated",
  intended_use: "Prompt and model regression testing; not a production benchmark.",
  source_summary: "37 frozen baseline cases plus 163 newly curated synthetic cases.",
  adjudication_summary: "Ten draft labels were changed from not_specified/attending to uncertain after applying the written rule that unresolved or conditional attendance is uncertain. No label was changed solely to preserve a numeric score.",
  annotation_policy: "Labels reflect only explicit attendance, numeric constraints, and confirmation deadlines. Unstated values remain null. Conditional or unresolved attendance is never labelled attending.",
  distribution: {
    cases: cases.length,
    by_group: countBy("group"),
    by_language: countBy("language")
  },
  cases
};

const serialized = `${JSON.stringify(dataset, null, 2)}\n`;
if (process.argv.includes("--check")) {
  const current = await readFile(outputPath, "utf8");
  assert.equal(current, serialized, "Golden dataset is stale; rebuild it before committing");
} else {
  await writeFile(outputPath, serialized, "utf8");
}
console.log(`GOLDEN_DATASET_OK cases=${cases.length} additions=${additions.length}`);
console.log(`groups=${JSON.stringify(dataset.distribution.by_group)}`);
console.log(`languages=${JSON.stringify(dataset.distribution.by_language)}`);
