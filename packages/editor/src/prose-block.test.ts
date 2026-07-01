import { describe, expect, test } from "vitest";
import { parseMdx } from "./mdx-document.js";
import { blockKindOf, isProseBlock } from "./prose-block.js";

const first = (mdx: string) => parseMdx(mdx).children[0];

describe("blockKindOf", () => {
  test("names each prose block kind", () => {
    expect(blockKindOf(first("plain text\n"))).toBe("paragraph");
    expect(blockKindOf(first("# Title\n"))).toBe("h1");
    expect(blockKindOf(first("### Sub\n"))).toBe("h3");
    expect(blockKindOf(first("- one\n- two\n"))).toBe("bulleted");
    expect(blockKindOf(first("1. one\n"))).toBe("numbered");
    expect(blockKindOf(first("- [ ] todo\n"))).toBe("todo");
    expect(blockKindOf(first("> a quote\n"))).toBe("quote");
  });

  test("is undefined for a non-prose node (a component, a code block)", () => {
    expect(blockKindOf(first("<Button />\n"))).toBeUndefined();
    expect(blockKindOf(first("```\ncode\n```\n"))).toBeUndefined();
  });
});

describe("isProseBlock", () => {
  test("is true for prose blocks, false for components and code", () => {
    expect(isProseBlock(first("plain\n"))).toBe(true);
    expect(isProseBlock(first("- item\n"))).toBe(true);
    expect(isProseBlock(first("<Hero />\n"))).toBe(false);
  });
});
