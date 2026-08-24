import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mvpRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(mvpRoot, "..");
const roots = [
  path.join(repoRoot, "README.md"),
  path.join(repoRoot, "_系统"),
  path.join(repoRoot, "产出"),
  path.join(mvpRoot, "README.md"),
  path.join(mvpRoot, "evals", "README.md"),
  path.join(mvpRoot, "supabase", "README.md")
];
const excludedSegments = new Set(["历史版本", "归档", "node_modules", ".next"]);

async function markdownFiles(target) {
  const stat = await import("node:fs/promises").then(({ stat }) => stat(target));
  if (stat.isFile()) return target.endsWith(".md") ? [target] : [];
  const entries = await readdir(target, { withFileTypes: true });
  const nested = await Promise.all(entries
    .filter((entry) => !excludedSegments.has(entry.name))
    .map((entry) => markdownFiles(path.join(target, entry.name))));
  return nested.flat();
}

const files = (await Promise.all(roots.map(markdownFiles))).flat();
const failures = [];
for (const file of files) {
  const markdown = await readFile(file, "utf8");
  const links = [...markdown.matchAll(/(?<!!)\[[^\]]*\]\(([^)]+)\)/g)].map((match) => match[1].trim());
  for (const rawTarget of links) {
    const target = rawTarget.replace(/^<|>$/g, "").split("#", 1)[0];
    if (!target || /^(?:https?:|mailto:|tel:)/i.test(target)) continue;
    const decoded = decodeURIComponent(target);
    const resolved = path.resolve(path.dirname(file), decoded);
    try {
      await access(resolved);
    } catch {
      failures.push(`${path.relative(repoRoot, file)} -> ${rawTarget}`);
    }
  }
}

assert.equal(failures.length, 0, `Broken documentation links:\n${failures.join("\n")}`);
console.log(`DOC_LINKS_OK files=${files.length}`);
