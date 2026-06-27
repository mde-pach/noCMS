import type { BlockDef, ComponentRegistry } from "@nocms/components";
import { describe, expect, test } from "vitest";
import { serializeMdx } from "./mdx-document.js";
import { createBlockNode, filterPalette, paletteItems } from "./palette.js";

const def = (extra: Partial<BlockDef> = {}): BlockDef =>
  ({ component: (() => null) as never, ...extra }) as BlockDef;

const registry: ComponentRegistry = {
  Stack: def({ slots: ["children"] }),
  Button: def(),
  Image: def(),
};

describe("paletteItems", () => {
  test("offers every registry block, name-sorted, flagging containers", () => {
    expect(paletteItems(registry)).toEqual([
      { name: "Button", container: false },
      { name: "Image", container: false },
      { name: "Stack", container: true },
    ]);
  });

  test("a new registry block needs no palette change (block-agnostic)", () => {
    const grown = { ...registry, Marquee: def({ slots: ["children"] }) };
    expect(paletteItems(grown).map((i) => i.name)).toContain("Marquee");
  });
});

describe("filterPalette", () => {
  const items = paletteItems(registry);
  test("substring-matches case-insensitively", () => {
    expect(filterPalette(items, "ut").map((i) => i.name)).toEqual(["Button"]);
    expect(filterPalette(items, "  ").map((i) => i.name)).toEqual([
      "Button",
      "Image",
      "Stack",
    ]);
  });
});

describe("createBlockNode", () => {
  test("a leaf serializes self-closing", () => {
    const node = createBlockNode("Image", registry.Image);
    expect(serializeMdx({ type: "root", children: [node] } as never).trim()).toBe(
      "<Image />",
    );
  });

  test("a container seeds one editable child", () => {
    const node = createBlockNode("Stack", registry.Stack);
    const text = serializeMdx({ type: "root", children: [node] } as never);
    expect(text).toContain("<Stack>");
    expect(text).toContain("Text");
    expect(text).toContain("</Stack>");
  });
});
