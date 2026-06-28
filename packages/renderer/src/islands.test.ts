import { h } from "preact";
import { renderToString } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import {
  type ComponentMap,
  collectIslands,
  deserializeIslandProps,
  ISLAND_ATTR,
  ISLAND_PROPS_ATTR,
  islandNamesFromHtml,
  renderToHtml,
  serializeIslandProps,
  wrapIslandComponents,
} from "./index.js";

const Counter = (props: Record<string, unknown>) =>
  h("button", null, `count: ${props.start ?? 0}`);
const Static = (props: Record<string, unknown>) =>
  h("p", null, props.children as never);
const isCounter = (type: unknown) => (type === Counter ? "Counter" : undefined);

describe("serializeIslandProps", () => {
  it("keeps JSON-serializable props", () => {
    expect(serializeIslandProps({ start: 5, label: "n", on: true })).toBe(
      '{"start":5,"label":"n","on":true}',
    );
  });

  it("drops children, functions, and VNodes — they can't cross as data", () => {
    const json = serializeIslandProps({
      start: 1,
      children: h("span", null, "x"),
      onClick: () => {},
      slot: h(Static, { children: "y" }),
    });
    expect(JSON.parse(json)).toEqual({ start: 1 });
  });

  it("round-trips through deserialize", () => {
    const props = { start: 3, step: 2, label: "votes" };
    expect(deserializeIslandProps(serializeIslandProps(props))).toEqual(props);
  });
});

describe("deserializeIslandProps", () => {
  it("returns empty props for null or malformed markers", () => {
    expect(deserializeIslandProps(null)).toEqual({});
    expect(deserializeIslandProps("{not json")).toEqual({});
  });
});

describe("collectIslands", () => {
  it("finds island sub-trees and their serializable props in a resolved tree", () => {
    const tree = h("main", null, [
      h(Static, { children: "intro" }),
      h(Counter, { start: 2, onClick: () => {} }),
      h("section", null, h(Counter, { start: 9 })),
    ]);
    const manifest = collectIslands(tree, isCounter);
    expect(manifest.islands).toEqual(["Counter"]);
    expect(manifest.instances).toEqual([
      { name: "Counter", props: { start: 2 } },
      { name: "Counter", props: { start: 9 } },
    ]);
  });

  it("returns nothing for an island-free tree", () => {
    const tree = h("main", null, h(Static, { children: "only prose" }));
    expect(collectIslands(tree, isCounter)).toEqual({ islands: [], instances: [] });
  });
});

describe("wrapIslandComponents", () => {
  const components: ComponentMap = { Counter, Static };

  it("wraps only named islands in a marker carrying name + props", () => {
    const wrapped = wrapIslandComponents(components, ["Counter"]);
    const html = renderToString(h(wrapped.Counter as never, { start: 7 }));
    expect(html).toContain(`${ISLAND_ATTR}="Counter"`);
    expect(html).toContain(`${ISLAND_PROPS_ATTR}="{&quot;start&quot;:7}"`);
    // the real component still renders inside the marker (so SSR === hydration target)
    expect(html).toContain("count: 7");
  });

  it("leaves non-island components untouched", () => {
    const wrapped = wrapIslandComponents(components, ["Counter"]);
    expect(wrapped.Static).toBe(Static);
    expect(renderToString(h(wrapped.Static as never, { children: "x" }))).toBe(
      "<p>x</p>",
    );
  });

  it("ignores names with no registered component", () => {
    const wrapped = wrapIslandComponents(components, ["Missing"]);
    expect(wrapped).toEqual(components);
  });
});

describe("islandNamesFromHtml", () => {
  it("extracts unique island names from prerendered markers", () => {
    const html =
      `<div ${ISLAND_ATTR}="Counter"></div>` +
      `<div ${ISLAND_ATTR}="Tabs"></div>` +
      `<div ${ISLAND_ATTR}="Counter"></div>`;
    expect(islandNamesFromHtml(html).sort()).toEqual(["Counter", "Tabs"]);
  });

  it("finds nothing in island-free HTML", () => {
    expect(islandNamesFromHtml("<p>plain content</p>")).toEqual([]);
  });
});

// Output is determined by the atoms, their positions, and the island marker contract — not by the
// engine that assembles them. So a different build-time assembler can't silently diverge from the
// editor: the @mdx-js path and a hand-built VNode tree with no MDX must render byte-identically.
describe("assembler portability (D17)", () => {
  const Counter = (props: Record<string, unknown>) =>
    h(
      "button",
      { type: "button", class: "counter" },
      `${props.label ?? "Count"}: ${props.start ?? 0}`,
    );
  const Section = (props: Record<string, unknown>) =>
    h("section", { class: "sec" }, props.children as never);
  const wrapped = wrapIslandComponents({ Counter, Section }, ["Counter"]);

  it("renders an island alone identically via MDX and via a hand-built VNode tree", async () => {
    const viaMdx = await renderToHtml({
      mdx: `<Counter label="Votes" start={2} />`,
      components: wrapped,
    });
    const viaVNode = renderToString(
      h(wrapped.Counter as never, { label: "Votes", start: 2 }),
    );
    expect(viaMdx).toBe(viaVNode);
    expect(viaMdx).toContain(`${ISLAND_ATTR}="Counter"`);
  });

  it("renders an island nested in a container identically via both assemblers", async () => {
    const viaMdx = await renderToHtml({
      mdx: `<Section><Counter start={1} /></Section>`,
      components: wrapped,
    });
    const viaVNode = renderToString(
      h(wrapped.Section as never, null, h(wrapped.Counter as never, { start: 1 })),
    );
    expect(viaMdx).toBe(viaVNode);
  });
});
