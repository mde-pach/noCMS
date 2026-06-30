// @vitest-environment happy-dom

import { block } from "@nocms/components";
import { h, render } from "preact";
import * as v from "valibot";
import { describe, expect, test } from "vitest";
import { anchorComponents } from "./content-anchors.js";
import { parseMdx } from "./mdx-document.js";

const Item = v.object({ title: v.string(), body: v.optional(v.string()) });
const SEED = [
  { title: "Alpha", body: "first" },
  { title: "Beta", body: "second" },
];

const DemoSchema = v.object({
  heading: v.string(),
  items: v.optional(v.array(Item), SEED),
});

type DemoProps = { heading: string; items?: typeof SEED };

/** Pass-through fixture: renders each prop verbatim, the curated-library common case. */
function Demo({ heading, items = SEED }: DemoProps) {
  return h(
    "section",
    null,
    h("h2", null, heading),
    ...items.map((it, i) =>
      h(
        "article",
        { key: i },
        h("h3", null, it.title),
        it.body ? h("p", null, it.body) : null,
      ),
    ),
  );
}

/** Transform fixture: upper-cases its leaves before rendering. */
function Shout({ heading, items = SEED }: DemoProps) {
  return h(
    "section",
    null,
    h("h2", null, heading.toUpperCase()),
    ...items.map((it, i) => h("h3", { key: i }, it.title.toUpperCase())),
  );
}

/** Mount a component the way the canvas does: its output inside a `data-mdx-pos` carrier whose
 *  offset matches the JSX node in the doc. Returns the content host the anchor pass walks. */
function mount(
  componentName: string,
  component: (p: DemoProps) => ReturnType<typeof h>,
  mdx: string,
) {
  const doc = parseMdx(mdx);
  const offset = doc.children[0]?.position?.start.offset ?? 0;
  const content = document.createElement("div");
  const carrier = document.createElement("span");
  carrier.setAttribute("data-mdx-pos", String(offset));
  content.appendChild(carrier);
  render(h(component as never, { heading: "Hello" }), carrier);
  const registry = { [componentName]: block(component, { schema: DemoSchema }) };
  return { content, doc, registry };
}

const pathOf = (content: HTMLElement, sel: string) =>
  content.querySelector(`[data-nocms-path="${sel}"]`);

describe("anchorComponents", () => {
  test("tags each text leaf — scalars and array elements — with its content path", () => {
    const { content, doc, registry } = mount("Demo", Demo, `<Demo heading="Hello" />`);
    anchorComponents(content, doc, registry);

    expect(pathOf(content, "heading")?.tagName).toBe("H2");
    expect(pathOf(content, "items.0.title")?.textContent).toBe("Alpha");
    expect(pathOf(content, "items.1.title")?.textContent).toBe("Beta");
    expect(pathOf(content, "items.0.body")?.textContent).toBe("first");
    expect(pathOf(content, "items.1.body")?.textContent).toBe("second");
  });

  test("survives a transform (toUpperCase) — the token, not the content, is matched", () => {
    const { content, doc, registry } = mount(
      "Shout",
      Shout,
      `<Shout heading="Hello" />`,
    );
    anchorComponents(content, doc, registry);

    // The live DOM shows the upper-cased value; the anchor still resolves the path.
    expect(pathOf(content, "items.0.title")?.textContent).toBe("ALPHA");
    expect(pathOf(content, "heading")?.textContent).toBe("HELLO");
  });

  test("disambiguates two identical strings by their distinct paths", () => {
    const doc = parseMdx(`<Demo heading="Hello" />`);
    const offset = doc.children[0]?.position?.start.offset ?? 0;
    const content = document.createElement("div");
    const carrier = document.createElement("span");
    carrier.setAttribute("data-mdx-pos", String(offset));
    content.appendChild(carrier);
    const items = [
      { title: "Same", body: "x" },
      { title: "Same", body: "y" },
    ];
    render(h(Demo, { heading: "Hello", items }), carrier);
    // The doc has no items attribute, so the schema default would diverge from the live render;
    // write the same items the live render used so probe and live align.
    const node = doc.children[0] as { attributes: unknown[] };
    node.attributes.push({
      type: "mdxJsxAttribute",
      name: "items",
      value: { type: "mdxJsxAttributeValueExpression", value: JSON.stringify(items) },
    });
    anchorComponents(content, doc, { Demo: block(Demo, { schema: DemoSchema }) });

    const titles = content.querySelectorAll('[data-nocms-path$=".title"]');
    expect([...titles].map((e) => e.getAttribute("data-nocms-path"))).toEqual([
      "items.0.title",
      "items.1.title",
    ]);
  });

  test("skips a component whose live structure diverges from the probe — never mis-tags", () => {
    const { content, doc, registry } = mount("Demo", Demo, `<Demo heading="Hello" />`);
    // Replace the live render with markup of a different shape: index zipping would be wrong, so
    // the pass must tag nothing rather than guess.
    const carrier = content.querySelector("[data-mdx-pos]") as HTMLElement;
    carrier.innerHTML = "<p>completely different</p>";
    anchorComponents(content, doc, registry);

    expect(content.querySelectorAll("[data-nocms-path]")).toHaveLength(0);
  });

  test("tags a standalone object prop's card so it is selectable as a unit", () => {
    const CtaSchema = v.object({
      cta: v.object({ label: v.string(), href: v.string() }),
    });
    type CtaProps = { cta: { label: string; href: string } };
    function Banner({ cta }: CtaProps) {
      return h(
        "section",
        null,
        h("div", { class: "cta" }, h("span", null, cta.label), h("em", null, cta.href)),
      );
    }
    const doc = parseMdx(`<Banner cta={{"label":"Go","href":"/x"}} />`);
    const offset = doc.children[0]?.position?.start.offset ?? 0;
    const content = document.createElement("div");
    const carrier = document.createElement("span");
    carrier.setAttribute("data-mdx-pos", String(offset));
    content.appendChild(carrier);
    render(h(Banner, { cta: { label: "Go", href: "/x" } }), carrier);
    anchorComponents(content, doc, {
      Banner: block(Banner as never, { schema: CtaSchema }),
    });

    // The object's two leaves are tagged, and their common-ancestor card carries the object path.
    const card = content.querySelector('[data-nocms-object="cta"]');
    expect(card?.classList.contains("cta")).toBe(true);
    expect(card?.querySelector('[data-nocms-path="cta.label"]')?.textContent).toBe(
      "Go",
    );
  });
});
