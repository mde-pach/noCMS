// @vitest-environment happy-dom

import { type ComponentType, h } from "preact";
import { describe, expect, test, vi } from "vitest";
import {
  type CanvasSelection,
  mountCanvas,
  offsetFromElement,
  paintedRootTag,
  selectionAtElement,
} from "./canvas.js";
import { parseMdx } from "./mdx-document.js";

// The Style panel keys its controls off the painted root tag of the selection. A *component* is
// annotated on a `display:contents` carrier (editable.ts wraps it in a `<span style="display:contents">`),
// so the real element to style is *inside* that carrier — this is the resolution that decides whether
// selecting a `<Hero/>` shows section controls or (wrongly) span controls.
describe("paintedRootTag", () => {
  function frag(html: string): Element {
    const root = document.createElement("div");
    root.innerHTML = html;
    return root.firstElementChild as Element;
  }

  test("descends a component carrier to its real root tag", () => {
    const carrier = frag(
      `<span data-mdx-pos="0" style="display:contents"><section><h1>Hi</h1></section></span>`,
    );
    expect(paintedRootTag(carrier)).toBe("section");
  });

  test("returns an intrinsic element's own tag (no carrier)", () => {
    expect(paintedRootTag(frag(`<h1 data-mdx-pos="0">Hi</h1>`))).toBe("h1");
  });

  test("resolves the real root through nested carriers", () => {
    const carrier = frag(
      `<span style="display:contents"><span style="display:contents"><a href="#">go</a></span></span>`,
    );
    expect(paintedRootTag(carrier)).toBe("a");
  });

  test("reports the painted root even when it isn't a styling-typical tag", () => {
    const carrier = frag(`<span style="display:contents"><header>nav</header></span>`);
    expect(paintedRootTag(carrier)).toBe("header");
  });

  test("returns undefined for nothing to resolve", () => {
    expect(paintedRootTag(null)).toBeUndefined();
    expect(paintedRootTag(undefined)).toBeUndefined();
  });
});

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

  test("a canvas click selects without following the link", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const handle = await mountCanvas({
      target,
      mdx: `[a link](https://example.com)\n`,
      components: {},
    });

    const link = target.querySelector("a");
    if (!link) throw new Error("link did not render");
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);

    handle.dispose();
  });

  test("suppressWhen leaves a click untouched — no preventDefault, no onSelect", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const onSelect = vi.fn();
    const handle = await mountCanvas({
      target,
      mdx: `[a link](https://example.com)\n`,
      components: {},
      onSelect,
      suppressWhen: (el) => el.tagName === "A",
    });

    const link = target.querySelector("a");
    if (!link) throw new Error("link did not render");
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(onSelect).not.toHaveBeenCalled();

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

describe("highlight overlay", () => {
  // happy-dom reports a zero bounding rect, so the overlay is verified structurally
  // (created on select, removed on deselect/dispose), not by pixel position.
  test("creates an overlay for a selected node and clears it on deselect", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const handle = await mountCanvas({
      target,
      mdx: `# Title\n`,
      components: {},
    });

    expect(target.querySelector(".nocms-overlay")).toBeNull();
    handle.highlight([0]); // the heading is the root's first child
    expect(target.querySelector(".nocms-overlay")).not.toBeNull();

    handle.highlight(undefined);
    expect(target.querySelector(".nocms-overlay")).toBeNull();

    handle.dispose();
  });

  test("re-applies the highlight after an update re-renders the canvas", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const handle = await mountCanvas({
      target,
      mdx: `# Title\n`,
      components: {},
    });

    handle.highlight([0]);
    await handle.update(`# Renamed title\n`);
    expect(target.querySelector(".nocms-overlay")).not.toBeNull();
    expect(target.textContent).toContain("Renamed title");

    handle.dispose();
    expect(target.querySelector(".nocms-overlay")).toBeNull();
  });
});
