import { core, manifestOf } from "@nocms/components";
import { expect, test } from "vitest";
import { blockFromManifest, insertBlock } from "./insert.js";
import { parseMdx, serializeMdx } from "./mdx-document.js";

const buttonManifest = manifestOf("Button", core.blocks.Button!);
const stackManifest = manifestOf("Stack", core.blocks.Stack!);

test("blockFromManifest stamps starter defaults onto a leaf node", () => {
  const node = blockFromManifest(buttonManifest);
  const out = serializeMdx({ type: "root", children: [node] });
  expect(out).toContain("<Button");
  expect(out).toContain('label="Label"');
  expect(out).toContain('variant="primary"');
});

test("blockFromManifest opens a child region for a slotted container", () => {
  const node = blockFromManifest(stackManifest);
  const out = serializeMdx({ type: "root", children: [node] });
  // a container serializes with an explicit close tag, not self-closing.
  expect(out).toContain("<Stack");
  expect(out).toContain("</Stack>");
});

test("insertBlock appends to the end when no selection", () => {
  const doc = parseMdx("# Title\n\nSome text.\n");
  const before = doc.children.length;
  const path = insertBlock(doc, blockFromManifest(buttonManifest));
  expect(path).toEqual([before]);
  expect(serializeMdx(doc)).toContain("<Button");
});

test("insertBlock inserts after the selected top-level block", () => {
  const doc = parseMdx("# A\n\n# B\n");
  insertBlock(doc, blockFromManifest(buttonManifest), [0]);
  // the Button lands between the two headings (index 1).
  expect(doc.children[1]?.type).toBe("mdxJsxFlowElement");
});
