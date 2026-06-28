import type { Nodes, Parent } from "mdast";
import { describe, expect, test } from "vitest";
import { parseMdx } from "./mdx-document.js";
import { isInlineTextComponent, isProseEditable } from "./prose-edit.js";

/** Depth-first find of the first node of a given type. */
function firstOfType(root: Nodes, type: string): Nodes | undefined {
  if (root.type === type) return root;
  for (const child of (root as Parent).children ?? []) {
    const found = firstOfType(child, type);
    if (found) return found;
  }
  return undefined;
}

describe("isProseEditable", () => {
  test("paragraphs and headings are prose-editable", () => {
    const doc = parseMdx(`# A heading\n\nA paragraph.\n`);
    const [heading, paragraph] = doc.children;
    expect(heading && isProseEditable(heading)).toBe(true);
    expect(paragraph && isProseEditable(paragraph)).toBe(true);
  });

  test("containers and components are not edited as prose spans", () => {
    const doc = parseMdx(`- item\n\n\`\`\`\ncode\n\`\`\`\n\n<Hero title="Hi" />\n`);
    for (const node of doc.children) {
      expect(isProseEditable(node)).toBe(false);
    }
  });
});

describe("isInlineTextComponent", () => {
  test("an inline component with text is editable as itself", () => {
    // Adjacent inline JSX with no blank line parses as inline elements within one paragraph.
    const doc = parseMdx(`<Badge variant="new">Row</Badge> <Badge>Col</Badge>\n`);
    const badge = firstOfType(doc, "mdxJsxTextElement");
    expect(badge && isInlineTextComponent(badge)).toBe(true);
  });

  test("a text-less inline component is not (nothing to edit in place)", () => {
    const doc = parseMdx(`Text <Icon name="star" /> more.\n`);
    const icon = firstOfType(doc, "mdxJsxTextElement");
    expect(icon && isInlineTextComponent(icon)).toBe(false);
  });

  test("a paragraph itself is not an inline component", () => {
    const doc = parseMdx(`Just prose.\n`);
    const para = doc.children[0];
    expect(para && isInlineTextComponent(para)).toBe(false);
  });
});
