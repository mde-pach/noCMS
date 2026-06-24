import { describe, expect, test } from "vitest";
import { parseMdx } from "./mdx-document.js";
import { isProseEditable } from "./prose-edit.js";

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
