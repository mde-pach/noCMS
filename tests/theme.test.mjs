import assert from "node:assert/strict";
import { test } from "node:test";
import { groupTokens, parseTheme, setToken } from "../src/lib/theme.mjs";

const CSS = `:root {
  --brand: #1f6f5e;
  --ink: #16201d;
  --font-body: system-ui, sans-serif;
  --space-2: 1rem;
}

:root[data-theme="dark"] { --brand: #4fbfa4; }
body { color: var(--ink); }
`;

test("reads tokens from the first :root block only", () => {
  const tokens = parseTheme(CSS);
  assert.deepEqual(
    tokens.map((t) => t.name),
    ["--brand", "--ink", "--font-body", "--space-2"],
  );
  assert.equal(tokens[0].value, "#1f6f5e");
});

test("classifies colours so the panel can offer a picker", () => {
  const byName = Object.fromEntries(parseTheme(CSS).map((t) => [t.name, t.kind]));
  assert.equal(byName["--brand"], "colour");
  assert.equal(byName["--ink"], "colour");
  assert.equal(byName["--font-body"], "text");
  assert.equal(byName["--space-2"], "text");
});

test("setToken rewrites one value and leaves everything else byte-identical", () => {
  const out = setToken(CSS, "--brand", "#ff0000");
  assert.ok(out.includes("--brand: #ff0000;"));
  assert.ok(out.includes("--ink: #16201d;"), "other tokens untouched");
  assert.ok(
    out.includes(':root[data-theme="dark"] { --brand: #4fbfa4; }'),
    "dark block untouched",
  );
  assert.ok(out.includes("body { color: var(--ink); }"), "rules untouched");
  assert.equal(out.length, CSS.length - "#1f6f5e".length + "#ff0000".length);
});

test("setToken ignores unknown tokens rather than corrupting the file", () => {
  assert.equal(setToken(CSS, "--nope", "x"), CSS);
});

test("tokens are grouped the way a person thinks about them", () => {
  const groups = groupTokens(parseTheme(CSS));
  assert.deepEqual([...groups.keys()], ["Colour", "Type", "Spacing"]);
  assert.equal(groups.get("Colour").length, 2);
});
