import assert from "node:assert/strict";
import { test } from "node:test";
import { describeChanges, describeThemeChanges } from "../src/lib/changes.mjs";
import { parsePage } from "../src/lib/page-tree.mjs";

const page = (body) =>
  parsePage(`---\nimport Hero from '../s/hero/index.astro';\n---\n${body}`);

test("says nothing when nothing changed", async () => {
  const a = await page(`<Hero title="A" />\n`);
  assert.deepEqual(describeChanges(a, await page(`<Hero title="A" />\n`)), []);
});

test("names the field that changed, not the file", async () => {
  const a = await page(`<Hero title="A" />\n`);
  const b = await page(`<Hero title="B" />\n`);
  assert.deepEqual(describeChanges(a, b), ["Changed title in Hero"]);
});

test("reports sections added and removed", async () => {
  const a = await page(`<Hero title="A" />\n`);
  const b = await page(`<Hero title="A" />\n<Hero title="B" />\n`);
  assert.deepEqual(describeChanges(a, b), ["Added 1 Hero section"]);
  assert.deepEqual(describeChanges(b, a), ["Removed 1 Hero section"]);
});

test("reports a reorder without inventing edits", async () => {
  const a = await page(`<Hero title="A" />\n<Cta title="B" />\n`);
  const b = await page(`<Cta title="B" />\n<Hero title="A" />\n`);
  assert.deepEqual(describeChanges(a, b), ["Reordered the sections"]);
});

test("theme changes say they affect every page", () => {
  const before = ":root { --brand: #111; --ink: #222; }";
  assert.deepEqual(describeThemeChanges(before, before), []);
  assert.deepEqual(
    describeThemeChanges(before, ":root { --brand: #f00; --ink: #222; }"),
    ["Changed --brand — affects every page"],
  );
  assert.deepEqual(
    describeThemeChanges(before, ":root { --brand: #f00; --ink: #0f0; }"),
    ["Changed 2 theme values — affects every page"],
  );
});
