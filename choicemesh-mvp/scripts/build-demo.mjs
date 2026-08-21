/**
 * Builds the public demo from the V3 high-fidelity prototype.
 *
 * The prototype in 产出/交付物/产品原型/06_ChoiceMesh_高保真原型_V3/ stays the single
 * source of truth for the interface. This script copies it into public/demo/
 * and appends one adapter script that replaces the prototype's simulated
 * private-draft extraction with the real /api/parse-details call.
 *
 * Nothing in the prototype file is edited, so the two never drift: re-running
 * this picks up any later prototype change. public/demo/ is generated output
 * and is not committed.
 *
 *   node scripts/build-demo.mjs
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const source = join(root, "..", "产出", "交付物", "产品原型", "06_ChoiceMesh_高保真原型_V3", "index.html");
const target = join(root, "public", "demo", "index.html");

const adapter = `
<script>
/* ChoiceMesh demo adapter — added by scripts/build-demo.mjs, not part of the prototype.
 *
 * The prototype ships a regex stand-in for the private-draft extraction so it can
 * run as a static file. Served from the Next.js app, the same interface can call
 * the real endpoint instead. The stand-in is kept as the offline fallback: a demo
 * visitor should never hit a dead end because the model is unavailable.
 *
 * The privacy boundary is unchanged. The reply goes to the server, which holds the
 * API key; the draft comes back to this browser only, and the member still has to
 * review and confirm it before any shared status changes.
 */
(() => {
  const simulate = window.createPrivateDraft;
  const AVAILABILITY = {
    attending: 'Can attend',
    uncertain: 'Possible — verify before confirming',
    cannot_attend: 'Cannot attend',
    not_specified: 'No attendance decision identified'
  };

  function injectBudgetRow() {
    const grid = document.querySelector('#detailsWorkspace .draft-grid');
    if (!grid || !state.draft || !state.draft.budget) return;
    if (grid.querySelector('[data-budget-row]')) return;
    const item = document.createElement('div');
    item.className = 'draft-item';
    item.setAttribute('data-budget-row', '');
    item.innerHTML = '<span>Budget limit</span><b></b>';
    item.querySelector('b').textContent = state.draft.budget;
    const items = grid.querySelectorAll('.draft-item');
    grid.insertBefore(item, items[items.length - 1] || null);
  }

  const baseRender = window.render;
  window.render = function () {
    const result = baseRender.apply(this, arguments);
    injectBudgetRow();
    return result;
  };

  window.createPrivateDraft = async function () {
    const input = $('conditionInput');
    const raw = input ? input.value.trim() : '';
    if (!raw) { toast('Write a short reply first.'); if (input) input.focus(); return; }
    state.conditionText = raw;

    const button = document.querySelector('#detailsWorkspace .btn.primary');
    const originalLabel = button ? button.textContent : '';
    if (button) { button.disabled = true; button.textContent = 'Analyzing…'; }

    try {
      const response = await fetch('/api/parse-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: raw })
      });
      const data = await response.json();
      if (!response.ok || !data.draft) throw new Error(data.error || 'unavailable');

      const draft = data.draft;
      state.draft = {
        availability: AVAILABILITY[draft.attendance] || AVAILABILITY.not_specified,
        commute: draft.travel_limit_minutes ? 'Up to ' + draft.travel_limit_minutes + ' minutes, one way' : 'No travel limit identified',
        budget: draft.budget_limit !== null && draft.budget_limit !== undefined ? 'Up to $' + draft.budget_limit : 'No budget limit identified',
        confirmation: draft.confirmation_by ? 'Expected ' + draft.confirmation_by : 'Still to confirm'
      };
      state.detailsMode = 'review';
      render();
      toast('Your private details are ready to review. Nothing has been shared or confirmed.');
    } catch (error) {
      if (button) { button.disabled = false; button.textContent = originalLabel; }
      simulate();
      toast('The analysis service was unreachable, so this draft was made in your browser. Check every field.');
    }
  };
})();
</script>
`;

const html = await readFile(source, "utf-8");
if (!html.includes("function createPrivateDraft(")) {
  throw new Error("The prototype no longer defines createPrivateDraft(); update the demo adapter.");
}

// A replacer function, not a replacement string: the adapter contains `$'`,
// which a replacement string would expand to "everything after the match".
const built = html.replace("</body>", () => `${adapter}</body>`);
await mkdir(dirname(target), { recursive: true });
await writeFile(target, built, "utf-8");
console.log(`demo built -> public/demo/index.html (${(built.length / 1024).toFixed(0)} KB)`);
