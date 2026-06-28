// The prose widget edits a single block's inline content (a flat `PhrasingContent[]`), so the
// editable blocks are exactly the ones whose children are phrasing content: paragraphs and
// headings. Lists, code, and blockquotes are containers of blocks, not prose spans.

import type { Heading, Nodes, Paragraph, PhrasingContent } from "mdast";

export type ProseBlock = Paragraph | Heading;

export function isProseEditable(node: Nodes): node is ProseBlock {
  return node.type === "paragraph" || node.type === "heading";
}

/** The prose widget edits a flat `PhrasingContent[]` in place — a paragraph/heading's children,
 *  or an inline component's children. This is the structural contract it needs from either. */
export interface ProseHost {
  children: PhrasingContent[];
}

/** An inline component (e.g. `<Badge>Row</Badge>`) whose text is editable on its own: its
 *  children are phrasing content, so the same widget edits just that component in place rather
 *  than the paragraph that holds a row of them. */
export function isInlineTextComponent(node: Nodes): node is Nodes & ProseHost {
  return (
    node.type === "mdxJsxTextElement" &&
    "children" in node &&
    (node as { children: unknown[] }).children.length > 0
  );
}
