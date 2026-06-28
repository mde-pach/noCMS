import type { Nodes } from "mdast";
import { describe, expect, test } from "vitest";
import { type MdxDocument, parseMdx, serializeMdx } from "./mdx-document.js";

// Drop source positions: they are a function of formatting, so two trees can be
// structurally identical while differing in position. Losslessness here means
// "same structure", not "same byte offsets".
function withoutPositions(node: Nodes): unknown {
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(visit);
    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        if (k === "position") continue;
        out[k] = visit(v);
      }
      return out;
    }
    return value;
  };
  return visit(node);
}

// Each covers an MDX construct the round-trip must not lose: the editor persists MDX text, so the
// tree it serializes must reproduce these exactly.
const fixtures: Record<string, string> = {
  jsxFlowWithAllAttributeKinds: `<Hero title="Welcome" count={3} dark {...rest}>
  Some **bold** child text.
</Hero>`,
  selfClosing: `<Button label="Go" onClick={handle} />`,
  inlineJsx: `Text with a <Badge variant="new">label</Badge> inline.`,
  expressionsAndComments: `{/* a comment */}

{data.items.map((x) => x.name)}`,
  frontmatter: `---
title: Home
---

# Heading

A paragraph.`,
  nestedJsx: `<Grid cols={2}>
  <Card title="A">
    Nested paragraph with a [link](https://example.com).
  </Card>
</Grid>`,
};

describe("mdx round-trip (D2b)", () => {
  for (const [name, src] of Object.entries(fixtures)) {
    test(`is structurally lossless: ${name}`, () => {
      const once = parseMdx(src);
      const twice = parseMdx(serializeMdx(once));
      expect(withoutPositions(twice)).toEqual(withoutPositions(once));
    });

    test(`serialization is a stable fixpoint: ${name}`, () => {
      const text1 = serializeMdx(parseMdx(src));
      const text2 = serializeMdx(parseMdx(text1));
      expect(text2).toBe(text1);
    });
  }

  test("JSX attribute names and values survive a round-trip", () => {
    const doc = parseMdx(`<Hero title="Welcome" count={3} dark {...rest} />`);
    const back = serializeMdx(doc);
    expect(back.trim()).toBe(`<Hero title="Welcome" count={3} dark {...rest} />`);
  });

  test("mutating a JSX attribute in the tree re-serializes", () => {
    const doc: MdxDocument = parseMdx(`<Button label="Go" />`);
    const el = doc.children[0];
    // The parsed flow JSX element exposes its attributes for editing.
    if (el?.type !== "mdxJsxFlowElement") throw new Error("expected JSX element");
    const attr = el.attributes.find(
      (a) => a.type === "mdxJsxAttribute" && a.name === "label",
    );
    if (attr?.type !== "mdxJsxAttribute") throw new Error("no label attr");
    attr.value = "Stop";
    expect(serializeMdx(doc).trim()).toBe(`<Button label="Stop" />`);
  });
});
