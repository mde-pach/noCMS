import type { Paragraph, PhrasingContent, RootContent } from "mdast";
import { describe, expect, it } from "vitest";
import { proseSchema } from "./schema.js";
import {
  docToMdast,
  docToMdastInline,
  mdastInlineToDoc,
  mdastToDoc,
} from "./transform.js";

/** Drop `position` (and any undefined-y keys) so round-trips compare on structure alone. */
function stripPosition<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripPosition) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (key === "position") continue;
      out[key] = stripPosition(v);
    }
    return out as T;
  }
  return value;
}

function roundTrip(nodes: PhrasingContent[]): PhrasingContent[] {
  return docToMdastInline(mdastInlineToDoc(nodes, proseSchema));
}

function expectRoundTrip(nodes: PhrasingContent[]): void {
  expect(stripPosition(roundTrip(nodes))).toEqual(stripPosition(nodes));
}

const text = (value: string): PhrasingContent => ({ type: "text", value });

describe("mdast inline ↔ ProseMirror round-trip", () => {
  it("preserves plain text", () => {
    expectRoundTrip([text("hello world")]);
  });

  it("preserves a single mark", () => {
    expectRoundTrip([{ type: "strong", children: [text("bold")] }]);
    expectRoundTrip([{ type: "emphasis", children: [text("italic")] }]);
  });

  it("preserves nested marks in canonical order (emphasis ⊃ strong)", () => {
    expectRoundTrip([
      { type: "emphasis", children: [{ type: "strong", children: [text("both")] }] },
    ]);
  });

  it("preserves strikethrough (GFM delete), alone and nested under a mark", () => {
    expectRoundTrip([{ type: "delete", children: [text("gone")] }]);
    expectRoundTrip([
      { type: "strong", children: [{ type: "delete", children: [text("both")] }] },
    ]);
  });

  it("preserves standalone inline code", () => {
    expectRoundTrip([{ type: "inlineCode", value: "const x = 1" }]);
  });

  it("preserves inline code interleaved inside a mark", () => {
    expectRoundTrip([
      {
        type: "strong",
        children: [text("call "), { type: "inlineCode", value: "fn()" }, text(" now")],
      },
    ]);
  });

  it("preserves inline code carrying a mark (bold code)", () => {
    expectRoundTrip([
      { type: "strong", children: [{ type: "inlineCode", value: "boldcode" }] },
    ]);
  });

  it("preserves a link with title and nested mark", () => {
    expectRoundTrip([
      {
        type: "link",
        url: "https://example.com",
        title: "Example",
        children: [text("see "), { type: "strong", children: [text("this")] }],
      },
    ]);
  });

  it("preserves a link without a title", () => {
    expectRoundTrip([
      {
        type: "link",
        url: "https://example.com",
        title: null,
        children: [text("plain link")],
      },
    ]);
  });

  it("preserves a hard break", () => {
    expectRoundTrip([text("line one"), { type: "break" }, text("line two")]);
  });

  it("preserves an inline JSX atom with attributes and children", () => {
    expectRoundTrip([
      text("a "),
      {
        type: "mdxJsxTextElement",
        name: "Badge",
        attributes: [{ type: "mdxJsxAttribute", name: "variant", value: "new" }],
        children: [text("hi")],
      } as unknown as PhrasingContent,
      text(" b"),
    ]);
  });

  it("preserves an inline expression atom verbatim (incl. estree data)", () => {
    expectRoundTrip([
      text("hello "),
      {
        type: "mdxTextExpression",
        value: "user.name",
        data: { estree: { type: "Program", body: [], sourceType: "module" } },
      } as unknown as PhrasingContent,
    ]);
  });

  it("preserves a self-closing JSX atom inside a mark", () => {
    expectRoundTrip([
      {
        type: "strong",
        children: [
          text("rating "),
          {
            type: "mdxJsxTextElement",
            name: "Stars",
            attributes: [{ type: "mdxJsxAttribute", name: "count", value: "5" }],
            children: [],
          } as unknown as PhrasingContent,
        ],
      },
    ]);
  });

  it("preserves an unmodeled inline construct (image) verbatim", () => {
    expectRoundTrip([
      text("look "),
      {
        type: "image",
        url: "/cat.png",
        alt: "a cat",
        title: null,
      } as unknown as PhrasingContent,
    ]);
  });

  it("preserves a dense mixture of every construct", () => {
    expectRoundTrip([
      text("Start "),
      { type: "strong", children: [text("bold")] },
      text(" and "),
      {
        type: "emphasis",
        children: [text("italic"), { type: "inlineCode", value: "x" }],
      },
      text(" then "),
      {
        type: "link",
        url: "https://nocms.dev",
        title: null,
        children: [text("a "), { type: "strong", children: [text("link")] }],
      },
      { type: "break" },
      {
        type: "mdxJsxTextElement",
        name: "Badge",
        attributes: [{ type: "mdxJsxAttribute", name: "tone", value: "ok" }],
        children: [text("new")],
      } as unknown as PhrasingContent,
      text(" "),
      { type: "mdxTextExpression", value: "count + 1" } as unknown as PhrasingContent,
      text(" end"),
    ]);
  });

  it("produces an empty inline list for an empty doc", () => {
    expect(roundTrip([])).toEqual([]);
  });
});

function blockRoundTrip(blocks: RootContent[]): RootContent[] {
  return docToMdast(mdastToDoc(blocks, proseSchema));
}

function expectBlockRoundTrip(blocks: RootContent[]): void {
  expect(stripPosition(blockRoundTrip(blocks))).toEqual(stripPosition(blocks));
}

const para = (...children: PhrasingContent[]): Paragraph => ({
  type: "paragraph",
  children,
});

describe("mdast blocks ↔ ProseMirror round-trip", () => {
  it("preserves a run of paragraphs (multi-block — Enter makes new paragraphs)", () => {
    expectBlockRoundTrip([
      para(text("First.")),
      para(text("Second.")),
      para(text("Third.")),
    ]);
  });

  it("preserves headings at every level, keeping inline marks", () => {
    expectBlockRoundTrip([
      { type: "heading", depth: 1, children: [text("Title")] },
      {
        type: "heading",
        depth: 3,
        children: [{ type: "strong", children: [text("Sub")] }],
      },
    ]);
  });

  it("preserves a bulleted list with multiple items", () => {
    expectBlockRoundTrip([
      {
        type: "list",
        ordered: false,
        spread: false,
        children: [
          { type: "listItem", spread: false, children: [para(text("one"))] },
          { type: "listItem", spread: false, children: [para(text("two"))] },
        ],
      },
    ]);
  });

  it("preserves an ordered list and its start index", () => {
    expectBlockRoundTrip([
      {
        type: "list",
        ordered: true,
        start: 3,
        spread: false,
        children: [
          { type: "listItem", spread: false, children: [para(text("third"))] },
        ],
      },
    ]);
  });

  it("preserves a GFM task list (checked + unchecked)", () => {
    expectBlockRoundTrip([
      {
        type: "list",
        ordered: false,
        spread: false,
        children: [
          {
            type: "listItem",
            spread: false,
            checked: false,
            children: [para(text("todo"))],
          },
          {
            type: "listItem",
            spread: false,
            checked: true,
            children: [para(text("done"))],
          },
        ],
      },
    ]);
  });

  it("preserves a blockquote wrapping paragraphs", () => {
    expectBlockRoundTrip([
      { type: "blockquote", children: [para(text("Quoted line."))] },
    ]);
  });

  it("carries an unmodeled block (code block) verbatim through an edit", () => {
    expectBlockRoundTrip([
      para(text("before")),
      { type: "code", lang: "ts", value: "const x = 1" } as unknown as RootContent,
      para(text("after")),
    ]);
  });

  it("round-trips a mixed document of every block kind", () => {
    expectBlockRoundTrip([
      { type: "heading", depth: 2, children: [text("Heading")] },
      para(text("A "), { type: "emphasis", children: [text("paragraph")] }, text(".")),
      {
        type: "list",
        ordered: false,
        spread: false,
        children: [{ type: "listItem", spread: false, children: [para(text("item"))] }],
      },
      { type: "blockquote", children: [para(text("quote"))] },
    ]);
  });

  it("falls back to one empty paragraph for an empty region", () => {
    expect(stripPosition(blockRoundTrip([]))).toEqual([
      { type: "paragraph", children: [] },
    ]);
  });
});
