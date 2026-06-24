import { describe, expect, test } from "vitest";
import { getProp, isJsxElement, removeProp, setProp } from "./jsx-attributes.js";
import { type MdxDocument, parseMdx, serializeMdx } from "./mdx-document.js";

function jsxElement(mdx: string) {
  const doc = parseMdx(mdx);
  const node = doc.children[0];
  if (!node || !isJsxElement(node)) throw new Error("expected a JSX element");
  return { doc, el: node };
}

function serializeFirst(doc: MdxDocument): string {
  return serializeMdx(doc).trim();
}

describe("isJsxElement", () => {
  test("recognizes flow JSX elements and rejects others", () => {
    expect(isJsxElement(parseMdx(`<B />\n`).children[0] as never)).toBe(true);
    expect(isJsxElement(parseMdx(`# h\n`).children[0] as never)).toBe(false);
  });
});

describe("getProp", () => {
  test("reads a string attribute", () => {
    const { el } = jsxElement(`<B label="Go" />\n`);
    expect(getProp(el, "label")).toBe("Go");
  });

  test("reads a numeric expression", () => {
    const { el } = jsxElement(`<B count={3} />\n`);
    expect(getProp(el, "count")).toBe(3);
  });

  test("reads boolean expressions and the shorthand", () => {
    const { el } = jsxElement(`<B on={true} off={false} dark />\n`);
    expect(getProp(el, "on")).toBe(true);
    expect(getProp(el, "off")).toBe(false);
    expect(getProp(el, "dark")).toBe(true);
  });

  test("returns undefined for an absent prop or an unrepresentable expression", () => {
    const { el } = jsxElement(`<B items={data.map((x) => x)} />\n`);
    expect(getProp(el, "missing")).toBeUndefined();
    expect(getProp(el, "items")).toBeUndefined();
  });
});

describe("setProp", () => {
  test("replaces a string attribute in place, preserving order", () => {
    const { doc, el } = jsxElement(`<B a="1" label="Go" c="3" />\n`);
    setProp(el, "label", "Stop");
    expect(serializeFirst(doc)).toBe(`<B a="1" label="Stop" c="3" />`);
  });

  test("adds a new string attribute", () => {
    const { doc, el } = jsxElement(`<B />\n`);
    setProp(el, "href", "/about");
    expect(serializeFirst(doc)).toBe(`<B href="/about" />`);
  });

  test("encodes numbers as expressions", () => {
    const { doc, el } = jsxElement(`<B />\n`);
    setProp(el, "count", 42);
    expect(serializeFirst(doc)).toBe(`<B count={42} />`);
  });

  test("encodes true as the shorthand and false as an expression", () => {
    const { doc, el } = jsxElement(`<B />\n`);
    setProp(el, "dark", true);
    setProp(el, "wide", false);
    expect(serializeFirst(doc)).toBe(`<B dark wide={false} />`);
  });

  test("round-trips through getProp", () => {
    const { el } = jsxElement(`<B />\n`);
    setProp(el, "title", "Hi");
    setProp(el, "n", 7);
    setProp(el, "flag", true);
    expect(getProp(el, "title")).toBe("Hi");
    expect(getProp(el, "n")).toBe(7);
    expect(getProp(el, "flag")).toBe(true);
  });
});

describe("removeProp", () => {
  test("drops the named attribute", () => {
    const { doc, el } = jsxElement(`<B a="1" b="2" />\n`);
    removeProp(el, "a");
    expect(serializeFirst(doc)).toBe(`<B b="2" />`);
    expect(getProp(el, "a")).toBeUndefined();
  });
});
