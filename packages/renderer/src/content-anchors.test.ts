import { h, type VNode } from "preact";
import { renderToString } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { type AnchorInput, probeContentAnchors, sentinelFor } from "./content-anchors";

// Fixtures stand in for curated components: each is agnostic — it receives plain strings and
// renders them in its own idiom. The probe never tells them anything.

type Item = { title: string };

/** Pass-through: the common case. `{item.title}` lands verbatim in a <li>. */
const PassThrough = (p: { items: Item[] }): VNode =>
  h(
    "ul",
    null,
    p.items.map((it, i) => h("li", { key: i }, it.title)),
  );

/** Transform: the component upper-cases its prop before rendering. */
const Shout = (p: { items: Item[] }): VNode =>
  h(
    "ul",
    null,
    p.items.map((it, i) => h("li", { key: i }, it.title.toUpperCase())),
  );

/** Interpolation: the prop is spliced into a larger string. */
const Greet = (p: { name: string }): VNode => h("p", null, `Welcome, ${p.name}`);

const itemPaths = (n: number): AnchorInput[] =>
  Array.from({ length: n }, (_, i) => ({ path: `items.${i}.title` }));

describe("probeContentAnchors", () => {
  it("locates pass-through leaves precisely, even when repeated", () => {
    const props = { items: [{ title: "Alpha" }, { title: "Beta" }] };
    const anchors = probeContentAnchors(
      (p) => PassThrough(p as never),
      props,
      itemPaths(2),
    );

    expect(anchors).toEqual([
      { path: "items.0.title", found: true, enclosingTag: "li" },
      { path: "items.1.title", found: true, enclosingTag: "li" },
    ]);
  });

  it("survives a transform the value-tag approach would lose (toUpperCase)", () => {
    const props = { items: [{ title: "Alpha" }] };
    const [anchor] = probeContentAnchors((p) => Shout(p as never), props, itemPaths(1));
    expect(anchor).toEqual({ path: "items.0.title", found: true, enclosingTag: "li" });
  });

  it("survives interpolation — the token is found as a substring", () => {
    const props = { name: "Ada" };
    const [anchor] = probeContentAnchors((p) => Greet(p as never), props, [
      { path: "name" },
    ]);
    expect(anchor).toEqual({ path: "name", found: true, enclosingTag: "p" });
  });

  it("reports not-found rather than guessing when a value is computed away", () => {
    // A component that ignores the prop entirely — nothing to anchor to.
    const Drop = (): VNode => h("p", null, "static");
    const [anchor] = probeContentAnchors(() => Drop(), { name: "x" }, [
      { path: "name" },
    ]);
    expect(anchor).toEqual({ path: "name", found: false });
  });

  it("leaves the component output identical to a real render (agnostic stand-in)", () => {
    // Same structure with real values vs. sentinels: only the text content differs, proving
    // the component took the same branches — the substitution changed content, not shape.
    const props = { items: [{ title: "Alpha" }, { title: "Beta" }] };
    const real = renderToString(PassThrough(props)).replace(/Alpha|Beta/g, "·");
    const withTokens = renderToString(
      PassThrough({ items: [{ title: sentinelFor(0) }, { title: sentinelFor(1) }] }),
    ).replace(/\d+/g, "·");
    expect(withTokens).toBe(real);
  });

  it("disambiguates where naive content-matching cannot — two identical titles", () => {
    // Both items render the same text. Searching the output for the real value "Same" is
    // ambiguous (two hits); a per-path token is unique, so each path pins its own node.
    const props = { items: [{ title: "Same" }, { title: "Same" }] };
    const html = renderToString(PassThrough(props));
    expect(html.match(/Same/g)).toHaveLength(2); // content-matching: ambiguous

    const anchors = probeContentAnchors(
      (p) => PassThrough(p as never),
      props,
      itemPaths(2),
    );
    expect(anchors.every((a) => a.found)).toBe(true);
    expect(sentinelFor(0)).not.toBe(sentinelFor(1)); // tokens: unambiguous
  });
});
