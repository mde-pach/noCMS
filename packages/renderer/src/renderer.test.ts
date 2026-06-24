import { h } from "preact";
import { describe, expect, it } from "vitest";
import {
  type ComponentMap,
  renderToHtml,
  renderToStaticHtml,
  renderToVNode,
} from "./index";

const components: ComponentMap = {
  Callout: (props) => h("aside", { class: "callout" }, props.children as never),
};

describe("renderToHtml", () => {
  it("renders markdown to HTML", async () => {
    const html = await renderToHtml({ mdx: "# Title\n\nBody text.", components: {} });
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<p>Body text.</p>");
  });

  it("maps MDX component tags to the provided components", async () => {
    const html = await renderToHtml({
      mdx: "Hello <Callout>note</Callout>.",
      components,
    });
    expect(html).toContain('<aside class="callout">note</aside>');
  });

  it("evaluates MDX expressions", async () => {
    const html = await renderToHtml({ mdx: "Sum: {1 + 2}", components: {} });
    expect(html).toContain("Sum: 3");
  });

  it("does not render YAML frontmatter as content", async () => {
    const html = await renderToHtml({
      mdx: "---\ntitle: Hidden\n---\n\n# Shown",
      components: {},
    });
    expect(html).toContain("<h1>Shown</h1>");
    expect(html).not.toContain("title: Hidden");
  });
});

describe("preview/publish parity", () => {
  it("prerenders the exact tree produced for preview", async () => {
    const input = { mdx: "## Same\n\n<Callout>x</Callout>", components };
    const previewTree = await renderToVNode(input);
    const published = renderToStaticHtml(previewTree);
    const direct = await renderToHtml(input);
    expect(published).toBe(direct);
  });
});
