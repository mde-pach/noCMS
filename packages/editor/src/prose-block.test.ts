import { describe, expect, test } from "vitest";
import { parseMdx, serializeMdx } from "./mdx-document.js";
import { type BlockKind, blockKindOf, isProseBlock, setBlock } from "./prose-block.js";

/** Reformat the first block of `mdx` to `kind` and return the serialized result (trimmed). */
function reformat(mdx: string, kind: BlockKind): string {
  const doc = parseMdx(mdx);
  expect(setBlock(doc, [0], kind)).toBe(true);
  return serializeMdx(doc).trim();
}

describe("blockKindOf", () => {
  test("names every prose block kind", () => {
    expect(blockKindOf(parseMdx("plain\n").children[0])).toBe("paragraph");
    expect(blockKindOf(parseMdx("## hi\n").children[0])).toBe("h2");
    expect(blockKindOf(parseMdx("- one\n").children[0])).toBe("bulleted");
    expect(blockKindOf(parseMdx("1. one\n").children[0])).toBe("numbered");
    expect(blockKindOf(parseMdx("> q\n").children[0])).toBe("quote");
  });

  test("is undefined for a non-prose node (a component)", () => {
    expect(isProseBlock(parseMdx("<Button />\n").children[0])).toBe(false);
  });
});

describe("setBlock", () => {
  test("paragraph → heading keeps the inline content, including marks", () => {
    expect(reformat("Hello **bold** world.\n", "h2")).toBe("## Hello **bold** world.");
  });

  test("heading → paragraph drops the hashes, keeps the text", () => {
    expect(reformat("### A title\n", "paragraph")).toBe("A title");
  });

  test("paragraph → bulleted / numbered list wraps it as one item", () => {
    expect(reformat("An item.\n", "bulleted")).toBe("* An item.");
    expect(reformat("An item.\n", "numbered")).toBe("1. An item.");
  });

  test("paragraph → quote wraps it in a blockquote", () => {
    expect(reformat("A wise thing.\n", "quote")).toBe("> A wise thing.");
  });

  test("paragraph → task list emits an unchecked GFM checkbox", () => {
    expect(reformat("Do this.\n", "todo")).toBe("* [ ] Do this.");
  });

  test("a task list is recognised as the 'todo' kind, and reverts to a plain list", () => {
    expect(blockKindOf(parseMdx("- [ ] todo\n").children[0])).toBe("todo");
    expect(reformat("- [x] done\n", "bulleted")).toBe("* done");
  });

  test("a multi-item list → paragraph keeps every item's text (one paragraph each)", () => {
    expect(reformat("- one\n- two\n", "paragraph")).toBe("one\n\ntwo");
  });

  test("list → heading turns each item into a heading, losslessly", () => {
    expect(reformat("- one\n- two\n", "h3")).toBe("### one\n\n### two");
  });

  test("refuses a non-prose block", () => {
    const doc = parseMdx("<Button />\n");
    expect(setBlock(doc, [0], "h2")).toBe(false);
  });
});
