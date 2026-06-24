import { describe, expect, test } from "vitest";
import { parseMdx } from "./mdx-document.js";
import {
  deepestNodeAtOffset,
  indexPathOf,
  nearestOfType,
  nodeAtIndexPath,
  nodeAtOffset,
} from "./position.js";

// `A <Badge>x</Badge> b.` on its own line after a heading. Offsets (from the source):
// heading `# Hi` is 0-4; the paragraph is 6-27; the inline <Badge> is 8-24.
const doc = parseMdx(`# Hi\n\nA <Badge>x</Badge> b.\n`);

describe("nodeAtOffset", () => {
  test("resolves a heading click to root → heading", () => {
    expect(nodeAtOffset(doc, 2).map((n) => n.type)).toEqual([
      "root",
      "heading",
      "text",
    ]);
  });

  test("resolves a click inside the inline JSX element through to its text", () => {
    const path = nodeAtOffset(doc, 17).map((n) => n.type);
    expect(path[0]).toBe("root");
    expect(path).toContain("paragraph");
    expect(path).toContain("mdxJsxTextElement");
  });

  test("resolves a click in surrounding prose to the paragraph's text, not the badge", () => {
    const path = nodeAtOffset(doc, 6).map((n) => n.type);
    expect(path).toContain("paragraph");
    expect(path).not.toContain("mdxJsxTextElement");
  });

  test("returns an empty path for an offset outside the tree", () => {
    expect(nodeAtOffset(doc, 999)).toEqual([]);
  });

  test("treats the end offset as exclusive", () => {
    const end = doc.position?.end.offset ?? 0;
    expect(nodeAtOffset(doc, end)).toEqual([]);
  });
});

describe("deepestNodeAtOffset", () => {
  test("returns the most specific node", () => {
    expect(deepestNodeAtOffset(doc, 2)?.type).toBe("text");
  });

  test("returns undefined outside the tree", () => {
    expect(deepestNodeAtOffset(doc, 999)).toBeUndefined();
  });
});

describe("nearestOfType", () => {
  test("finds the nearest JSX element ancestor for a click inside it", () => {
    const path = nodeAtOffset(doc, 17);
    expect(nearestOfType(path, ["mdxJsxTextElement", "mdxJsxFlowElement"])?.type).toBe(
      "mdxJsxTextElement",
    );
  });

  test("returns undefined when no node in the path matches", () => {
    const path = nodeAtOffset(doc, 2);
    expect(nearestOfType(path, ["mdxJsxFlowElement"])).toBeUndefined();
  });
});

describe("indexPathOf / nodeAtIndexPath", () => {
  test("index-path round-trips back to the same node", () => {
    const path = nodeAtOffset(doc, 17);
    const badge = nearestOfType(path, ["mdxJsxTextElement"]);
    if (!badge) throw new Error("fixture");
    const indexPath = indexPathOf(path, badge);
    expect(indexPath).toBeDefined();
    expect(nodeAtIndexPath(doc, indexPath as number[])).toBe(badge);
  });

  test("the root resolves to the empty index-path", () => {
    const path = nodeAtOffset(doc, 2);
    expect(indexPathOf(path, doc)).toEqual([]);
    expect(nodeAtIndexPath(doc, [])).toBe(doc);
  });

  test("a node absent from the path has no index-path", () => {
    const path = nodeAtOffset(doc, 2);
    const otherPath = nodeAtOffset(doc, 17);
    const badge = nearestOfType(otherPath, ["mdxJsxTextElement"]);
    if (!badge) throw new Error("fixture");
    expect(indexPathOf(path, badge)).toBeUndefined();
  });

  test("an out-of-range index-path resolves to undefined", () => {
    expect(nodeAtIndexPath(doc, [99])).toBeUndefined();
  });

  test("the index-path is stable across a structure-preserving re-parse", () => {
    const path = nodeAtOffset(doc, 17);
    const badge = nearestOfType(path, ["mdxJsxTextElement"]);
    if (!badge) throw new Error("fixture");
    const indexPath = indexPathOf(path, badge) as number[];
    const reparsed = parseMdx(`# Hi\n\nA <Badge>x</Badge> b.\n`);
    expect(nodeAtIndexPath(reparsed, indexPath)?.type).toBe("mdxJsxTextElement");
  });
});
