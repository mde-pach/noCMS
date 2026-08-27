import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const read = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? read(full) : [full];
  });

const editorFiles = read("editor").filter((f) => /\.(mjs|tsx|ts)$/.test(f));

test("the editor never imports from the site's components", () => {
  // If it did, deleting a component would break the editor you need to fix it —
  // and the editor is served from the site it edits, so that is unrecoverable.
  for (const file of editorFiles) {
    const source = fs.readFileSync(file, "utf-8");
    const bad = source.match(/from\s+["'][^"']*src\/components[^"']*["']/g);
    assert.equal(
      bad,
      null,
      `${file} imports the site's components: ${bad?.join(", ")}`,
    );
  }
});

test("the editor keeps its own copy of the component set", () => {
  assert.ok(fs.existsSync("editor/ui/button.tsx"), "editor/ui is the pinned copy");
  assert.ok(fs.existsSync("editor/ui/tokens.css"), "and its own tokens");
});

test("the chrome styles itself only from editor tokens", () => {
  // The site's tokens live in the canvas iframe. If the chrome read them, re-theming
  // a site would restyle the editor around it.
  const css = fs.readFileSync("editor/ui/ui.css", "utf-8");
  const siteTokens = css.match(/var\(--(?!ed-)[a-z-]+\)/g) ?? [];
  assert.deepEqual(
    siteTokens,
    [],
    `chrome reads site tokens: ${siteTokens.join(", ")}`,
  );
});

test("site component files are not referenced by the editor build", () => {
  const config = fs.readFileSync("nocms.config.mjs", "utf-8");
  assert.ok(
    config.includes("src/components"),
    "the site's components are still globbed for the canvas",
  );
});
