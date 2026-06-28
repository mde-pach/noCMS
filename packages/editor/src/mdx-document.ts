// Parse and serialize go through one processor so a parse→edit→serialize cycle is structurally
// lossless on JSX blocks, attributes, and expressions; edits mutate the tree, never re-derive it
// from rendered output.

import type { Root } from "mdast";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";

const processor = unified()
  .use(remarkParse)
  .use(remarkFrontmatter)
  .use(remarkMdx)
  .use(remarkStringify);

/** The in-memory document: an mdast tree with MDX (JSX/expression) nodes. */
export type MdxDocument = Root;

/** Parse MDX text into the editable tree. Source positions are retained so a
 * visual selection can map back to the node that produced it. */
export function parseMdx(mdx: string): MdxDocument {
  return processor.parse(mdx) as MdxDocument;
}

/** Serialize the tree back to MDX text — the artifact committed to git. */
export function serializeMdx(doc: MdxDocument): string {
  return processor.stringify(doc);
}
