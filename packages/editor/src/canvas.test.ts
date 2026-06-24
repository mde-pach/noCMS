// @vitest-environment happy-dom

import { type ComponentType, h } from "preact";
import { describe, expect, test, vi } from "vitest";
import {
  type CanvasSelection,
  mountCanvas,
  offsetFromElement,
  selectionAtElement,
} from "./canvas.js";
import { parseMdx } from "./mdx-document.js";

describe("offsetFromElement", () => {
  test("walks to the nearest annotated ancestor", () => {
    const root = document.createElement("div");
    root.innerHTML = `<section data-mdx-pos="6"><span><b id="leaf">x</b></span></section>`;
    const leaf = root.querySelector("#leaf");
    if (!leaf) throw new Error("fixture");
    expect(offsetFromElement(leaf)).toBe(6);
  });

  test("returns undefined when no ancestor is annotated", () => {
    const el = document.createElement("p");
    expect(offsetFromElement(el)).toBeUndefined();
  });

  test("returns undefined for a non-numeric attribute", () => {
    const el = document.createElement("div");
    el.setAttribute("data-mdx-pos", "nope");
    expect(offsetFromElement(el)).toBeUndefined();
  });
});

describe("selectionAtElement", () => {
  test("resolves a clicked element to its mdast node path", () => {
    const doc = parseMdx(`# Hi\n\nA paragraph.\n`);
    const el = document.createElement("p");
    el.setAttribute("data-mdx-pos", "6"); // the paragraph's start offset
    const selection = selectionAtElement(doc, el);
    expect(selection?.offset).toBe(6);
    // The deepest node at a block's start offset is its first inline child; the editor
    // picks block-vs-inline granularity from the path.
    expect(selection?.path.map((n) => n.type)).toEqual(["root", "paragraph", "text"]);
    expect(selection?.node.type).toBe("text");
  });

  test("returns undefined for an unannotated element", () => {
    const doc = parseMdx(`# Hi\n`);
    expect(selectionAtElement(doc, document.createElement("div"))).toBeUndefined();
  });
});

describe("mountCanvas", () => {
  const Box: ComponentType<Record<string, unknown>> = (props) =>
    h("div", { class: "box" }, props.children as never);

  test("reports the selected node on click", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const onSelect = vi.fn();
    const handle = await mountCanvas({
      target,
      mdx: `# Title\n\n<Box>\n  hello\n</Box>\n`,
      components: { Box },
      onSelect,
    });

    const boxDiv = target.querySelector(".box");
    if (!boxDiv) throw new Error("component did not render");
    boxDiv.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    const selection = onSelect.mock.calls[0]?.[0] as CanvasSelection | undefined;
    expect(selection?.node.type).toBe("mdxJsxFlowElement");
    expect((selection?.node as { name?: string }).name).toBe("Box");

    handle.dispose();
  });

  test("reports undefined when the click misses any annotated element", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const onSelect = vi.fn();
    const handle = await mountCanvas({
      target,
      mdx: `# Title\n`,
      components: {},
      onSelect,
    });

    target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onSelect).toHaveBeenLastCalledWith(undefined);

    handle.dispose();
  });

  test("dispose unmounts and stops listening", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const onSelect = vi.fn();
    const handle = await mountCanvas({
      target,
      mdx: `# Title\n`,
      components: {},
      onSelect,
    });
    handle.dispose();

    expect(target.childNodes.length).toBe(0);
    target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
