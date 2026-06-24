import { describe, expect, test } from "vitest";
import { parseMdx } from "./mdx-document.js";
import { nodeAtOffset } from "./position.js";
import { selectableNode } from "./selectable.js";

// `A <Badge>x</Badge> b.` after a heading (offsets per position.test.ts).
const doc = parseMdx(`# Hi\n\nA <Badge>x</Badge> b.\n`);

describe("selectableNode", () => {
  test("picks the heading block, not its inner text", () => {
    expect(selectableNode(nodeAtOffset(doc, 2))?.type).toBe("heading");
  });

  test("picks the inline JSX component over the surrounding paragraph", () => {
    expect(selectableNode(nodeAtOffset(doc, 17))?.type).toBe("mdxJsxTextElement");
  });

  test("picks the paragraph for a click in plain prose", () => {
    expect(selectableNode(nodeAtOffset(doc, 6))?.type).toBe("paragraph");
  });

  test("returns undefined for an empty path", () => {
    expect(selectableNode([])).toBeUndefined();
  });

  test("selects a flow component as a whole", () => {
    const flow = parseMdx(`<Hero title="Hi" />\n`);
    const path = nodeAtOffset(flow, 0);
    expect(selectableNode(path)?.type).toBe("mdxJsxFlowElement");
  });
});
