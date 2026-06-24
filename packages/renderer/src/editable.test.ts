import { type ComponentType, h } from "preact";
import { describe, expect, test } from "vitest";
import { renderEditableToVNode, renderToHtml, renderToStaticHtml } from "./index.js";

const Box: ComponentType<Record<string, unknown>> = ({ title, children }) =>
  h("div", { class: "box", "data-title": title as string }, children as never);
const components = { Box };

// `# Title` is offset 0; the paragraph "Hello world." starts at offset 9; the <Box>
// element starts at offset 23. data-mdx-pos must equal those source offsets so the
// editor's nodeAtOffset resolver maps a click straight back to the mdast node.
const mdx = `# Title\n\nHello world.\n\n<Box title="x">inner</Box>\n`;

describe("renderEditableToVNode", () => {
  test("stamps intrinsic elements with their source offset", async () => {
    const html = renderToStaticHtml(await renderEditableToVNode({ mdx, components }));
    expect(html).toContain('<h1 data-mdx-pos="0">Title</h1>');
    expect(html).toContain('<p data-mdx-pos="9">Hello world.</p>');
  });

  test("wraps components in a display:contents carrier holding the offset", async () => {
    const html = renderToStaticHtml(await renderEditableToVNode({ mdx, components }));
    expect(html).toContain(
      '<span data-mdx-pos="23" style="display:contents"><div class="box" data-title="x">inner</div></span>',
    );
  });

  test("the publish path stays clean — no annotations leak", async () => {
    const html = await renderToHtml({ mdx, components });
    expect(html).not.toContain("data-mdx-pos");
    expect(html).not.toContain("display:contents");
  });

  test("frontmatter is stripped, matching the publish path", async () => {
    const withFm = `---\ntitle: T\n---\n\n# Body\n`;
    const html = renderToStaticHtml(
      await renderEditableToVNode({ mdx: withFm, components }),
    );
    expect(html).not.toContain("title: T");
    expect(html).toContain("Body");
  });
});
