import type { Nodes } from "mdast";
import { describe, expect, test } from "vitest";
import { type MdxDocument, parseMdx, serializeMdx } from "./mdx-document.js";
import { createBlockNode } from "./palette.js";
import { insertAt, moveChild, moveNode, removeAt } from "./tree-edit.js";

// The top-level block names of a parsed document, in order — a compact way to assert a
// structural transform without comparing whole trees.
function topLevel(tree: Nodes): string[] {
  const kids = (tree as { children?: Nodes[] }).children ?? [];
  return kids.map((n) => ("name" in n && n.name ? n.name : n.type));
}

// Drop source positions: a transform leaves stale offsets behind, so structural
// equality means "same shape", not "same byte offsets" (matches mdx-document.test).
function withoutPositions(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(withoutPositions);
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === "position") continue;
      out[k] = withoutPositions(v);
    }
    return out;
  }
  return node;
}

const SRC = `<Section>
  Intro
</Section>

<Button label="A" />

<Button label="B" />
`;

describe("tree-edit transforms (D15)", () => {
  test("removeAt drops the addressed sibling, leaves the rest", () => {
    const doc = parseMdx(SRC);
    expect(topLevel(doc)).toEqual(["Section", "Button", "Button"]);
    const next = removeAt(doc, [1]);
    expect(topLevel(next)).toEqual(["Section", "Button"]);
    // The input tree is untouched — transforms are pure.
    expect(topLevel(doc)).toEqual(["Section", "Button", "Button"]);
  });

  test("insertAt splices a new block at the given root index", () => {
    const doc = parseMdx(SRC);
    const node = createBlockNode("Image", undefined);
    const next = insertAt(doc, [], 1, node);
    expect(topLevel(next)).toEqual(["Section", "Image", "Button", "Button"]);
  });

  test("insertAt clamps an out-of-range index to the end", () => {
    const doc = parseMdx(SRC);
    const next = insertAt(doc, [], 99, createBlockNode("Image", undefined));
    expect(topLevel(next)).toEqual(["Section", "Button", "Button", "Image"]);
  });

  test("moveChild reorders siblings — move down then up", () => {
    const doc = parseMdx(SRC);
    const down = moveChild(doc, [], 0, 1);
    expect(topLevel(down)).toEqual(["Button", "Section", "Button"]);
    const up = moveChild(down, [], 2, 1);
    expect(topLevel(up)).toEqual(["Button", "Button", "Section"]);
  });

  test("moveNode relocates a block into a container slot", () => {
    const doc = parseMdx(SRC);
    // Move the first Button (root index 1) to be the last child of Section (root index 0).
    const sectionChildren = (doc as { children: Nodes[] }).children[0] as {
      children: Nodes[];
    };
    const next = moveNode(doc, [1], [0], sectionChildren.children.length);
    expect(topLevel(next)).toEqual(["Section", "Button"]);
    const movedSection = (next as { children: Nodes[] }).children[0] as {
      children: Nodes[];
    };
    expect(movedSection.children.some((c) => "name" in c && c.name === "Button")).toBe(
      true,
    );
  });

  test("an unresolvable address returns the tree unchanged", () => {
    const doc = parseMdx(SRC);
    expect(removeAt(doc, [99])).toBe(doc);
    expect(removeAt(doc, [])).toBe(doc);
    expect(moveNode(doc, [99], [], 0)).toBe(doc);
    expect(insertAt(doc, [99], 0, createBlockNode("Image", undefined))).toBe(doc);
  });
});

// The load-bearing D15 property: a transformed tree serializes to canonical MDX that
// re-parses to an identical tree, and serializing is a stable fixpoint. This is what
// makes "git-backed" hold — a non-deterministic serializer is what quietly breaks it.
describe("canonical MDX round-trip after a transform (D15)", () => {
  const node = createBlockNode("Image", undefined);
  const container = createBlockNode("Stack", {
    component: (() => null) as never,
    slots: ["children"],
  });
  const transforms: Record<string, (doc: MdxDocument) => MdxDocument> = {
    insertLeaf: (doc) => insertAt(doc, [], 1, node),
    insertContainer: (doc) => insertAt(doc, [], 0, container),
    remove: (doc) => removeAt(doc, [1]),
    reorderDown: (doc) => moveChild(doc, [], 0, 2),
    reorderUp: (doc) => moveChild(doc, [], 2, 0),
    intoSlot: (doc) => moveNode(doc, [1], [0], 1),
  };

  for (const [name, transform] of Object.entries(transforms)) {
    test(`re-parse yields an identical tree: ${name}`, () => {
      const edited = transform(parseMdx(SRC));
      const text = serializeMdx(edited);
      const reparsed = parseMdx(text);
      expect(withoutPositions(reparsed)).toEqual(withoutPositions(edited));
    });

    test(`serialization is deterministic (stable fixpoint): ${name}`, () => {
      const edited = transform(parseMdx(SRC));
      const once = serializeMdx(edited);
      const twice = serializeMdx(parseMdx(once));
      expect(twice).toBe(once);
    });
  }
});
