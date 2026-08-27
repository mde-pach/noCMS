import assert from "node:assert/strict";
import { test } from "node:test";
import {
  literalValue,
  parsePage,
  sections,
  serializePage,
} from "../src/lib/page-tree.mjs";

const roundtrip = async (src) => serializePage(await parsePage(src));

const CASES = [
  `---\nimport Hero from '../sections/hero/index.astro';\nconst year = new Date().getFullYear();\n---\n<Hero title="Hi" />\n<p>© {year}</p>\n`,
  `<div class="a"><span>text</span></div>\n`,
  `---\nconst x = 1;\n---\n<Nav items={[{ label: "Home", href: "/" }]} sticky={true} />\n`,
  `<!-- a comment -->\n<p>plain</p>\n`,
  `<Columns count={2}>\n  <Hero slot="left" title="L" />\n  <Hero slot="right" title="R" />\n</Columns>\n`,
];

test("round-trip is byte-identical for normalised pages", async () => {
  // Everything the editor itself writes is already normalised, so this is the
  // steady state. The one exception is documented in the idempotence test below.
  for (const src of CASES.filter((c) => !c.startsWith("<!--"))) {
    assert.equal(await roundtrip(src), src);
  }
});

test("serialization is idempotent — saving twice changes nothing", async () => {
  for (const src of CASES) {
    const once = await roundtrip(src);
    const twice = await roundtrip(once);
    assert.equal(twice, once, `not idempotent for: ${JSON.stringify(src)}`);
  }
});

test("no content is ever lost, even when formatting is normalised", async () => {
  const src = `<!-- keep me -->\n<p>© {year} — all rights</p>\n`;
  const out = await roundtrip(src);
  for (const fragment of ["keep me", "©", "{year}", "— all rights"]) {
    assert.ok(out.includes(fragment), `lost ${fragment} -> ${out}`);
  }
});

test("text children and expressions are never dropped", async () => {
  const src = `<p>© {year} — all rights</p>\n`;
  assert.equal(await roundtrip(src), src);
  const page = await parsePage(src);
  const kinds = page.body[0].children.map((c) => c.type);
  assert.deepEqual(kinds, ["text", "expression", "text"]);
});

test("prop kinds: text, data, code", async () => {
  const page = await parsePage(
    `<Nav title="Site" items={[{ label: "Home", href: "/" }]} sticky={true} year={year} />\n`,
  );
  const p = page.body[0].props;
  assert.equal(p.title.kind, "text");
  assert.equal(p.items.kind, "data");
  assert.deepEqual(p.items.value, [{ label: "Home", href: "/" }]);
  assert.equal(p.sticky.kind, "data");
  assert.equal(p.sticky.value, true);
  assert.equal(p.year.kind, "code");
});

test("literalValue never executes code", () => {
  assert.equal(literalValue("year").isLiteral, false);
  assert.equal(literalValue("getStuff()").isLiteral, false);
  assert.equal(literalValue("a.b").isLiteral, false);
  // biome-ignore lint/suspicious/noTemplateCurlyInString: a template literal is the input under test
  assert.equal(literalValue("`x${y}`").isLiteral, false);
  // would throw or set a global if evaluated
  assert.equal(literalValue("(globalThis.__pwned = 1)").isLiteral, false);
  assert.equal(globalThis.__pwned, undefined);
  assert.equal(literalValue("true").isLiteral, true);
  assert.equal(literalValue("[1,2,3]").isLiteral, true);
  assert.deepEqual(literalValue('{ a: "b" }').value, { a: "b" });
});

test("editing a prop changes only that prop", async () => {
  const src = `---\nconst year = 1;\n---\n<Hero title="Old" tint="#111" />\n<p>{year}</p>\n`;
  const page = await parsePage(src);
  page.body[0].props.title.value = "New";
  const out = serializePage(page);
  assert.equal(out, src.replace('"Old"', '"New"'));
});

test("sections() finds components at any depth, not html", async () => {
  const page = await parsePage(
    `<div><Hero title="a" /><Columns><Hero title="b" /></Columns></div>\n`,
  );
  assert.deepEqual(
    sections(page.body).map((s) => s.node.name),
    ["Hero", "Columns", "Hero"],
  );
});

test("imports bind tags to modules, and aliases are followed", async () => {
  const { parseImports } = await import("../src/lib/page-tree.mjs");
  const page = await parsePage(
    `---\nimport FeatureGrid from '../sections/feature-grid/index.astro';\nimport Whatever from '../sections/hero/index.astro';\n---\n<FeatureGrid />\n<Whatever title="x" />\n`,
  );
  // The tag name is arbitrary; the import is what binds it to a section.
  assert.equal(page.imports.FeatureGrid, "../sections/feature-grid/index.astro");
  assert.equal(page.imports.Whatever, "../sections/hero/index.astro");
  assert.deepEqual(Object.keys(parseImports(page.frontmatter)), [
    "FeatureGrid",
    "Whatever",
  ]);
});

test("ensureImport adds a missing binding and never duplicates one", async () => {
  const { ensureImport } = await import("../src/lib/page-tree.mjs");
  const page = await parsePage(
    `---\nimport Hero from '../sections/hero/index.astro';\n---\n<Hero title="x" />\n`,
  );

  assert.equal(
    ensureImport(page, "CallToAction", "../sections/call-to-action/index.astro"),
    true,
  );
  assert.equal(
    ensureImport(page, "CallToAction", "../sections/call-to-action/index.astro"),
    false,
  );

  const out = serializePage(page);
  assert.equal((out.match(/import CallToAction/g) || []).length, 1);
  assert.ok(
    out.includes("import Hero from '../sections/hero/index.astro';"),
    "existing import kept",
  );
  assert.ok(out.startsWith("---"), "frontmatter still well formed");
});
