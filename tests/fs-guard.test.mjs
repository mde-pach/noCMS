import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";

// Mirror of resolveSafe, kept in sync with src/lib/fs-endpoint.ts.
const ROOT = "/project";
const WRITABLE = ["src/pages", "src/layouts", "src/styles", "src/content", "public"];
function resolveSafe(rel, forWrite) {
  const full = path.resolve(ROOT, rel);
  if (full !== ROOT && !full.startsWith(ROOT + path.sep))
    throw new Error("path escapes project");
  const relative = path.relative(ROOT, full);
  if (
    forWrite &&
    !WRITABLE.some((d) => relative === d || relative.startsWith(d + path.sep))
  ) {
    throw new Error(`not writable: ${relative}`);
  }
  return full;
}

test("refuses writes that escape the project", () => {
  for (const bad of ["../outside.txt", "../../etc/passwd", "/etc/passwd"]) {
    assert.throws(() => resolveSafe(bad, true), /escapes project|not writable/);
  }
});

test("refuses writes outside editor-owned directories", () => {
  for (const bad of [
    "package.json",
    "src/lib/page-tree.mjs",
    "node_modules/x/index.js",
    ".github/workflows/deploy.yml",
  ]) {
    assert.throws(() => resolveSafe(bad, true), /not writable/);
  }
});

test("allows writes the editor legitimately makes", () => {
  for (const ok of [
    "src/pages/index.astro",
    "src/pages/about/index.astro",
    "src/styles/theme.css",
    "public/media/a.webp",
  ]) {
    assert.equal(resolveSafe(ok, true), path.join(ROOT, ok));
  }
});

test("reads are allowed more broadly than writes", () => {
  assert.equal(
    resolveSafe("src/sections/hero/index.astro", false),
    "/project/src/sections/hero/index.astro",
  );
  assert.throws(() => resolveSafe("../secrets", false), /escapes project/);
});
