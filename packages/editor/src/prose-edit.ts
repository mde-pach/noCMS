// The prose widget is block-aware: it edits a top-level prose block (paragraph, heading, list, or
// blockquote) as a small document, so Enter/lists/headings work inside it. The inline variant edits
// just one inline component's phrasing content (a `<Badge>`), kept to a single line.

import type {
  Blockquote,
  Heading,
  List,
  Nodes,
  Paragraph,
  PhrasingContent,
} from "mdast";

/** A top-level prose block the editor opens as a document. */
export type ProseBlock = Paragraph | Heading | List | Blockquote;

const PROSE_BLOCK_TYPES = new Set(["paragraph", "heading", "list", "blockquote"]);

export function isProseBlock(node: Nodes): node is ProseBlock {
  return PROSE_BLOCK_TYPES.has(node.type);
}

/** Editable as prose when it is a prose block — paragraphs and headings, and now whole lists and
 *  blockquotes, which the block-aware editor handles natively. */
export function isProseEditable(node: Nodes): node is ProseBlock {
  return isProseBlock(node);
}

/** The shallowest prose block on the path root→leaf — so clicking text inside a list edits the whole
 *  list (not the inner paragraph), and a stray paragraph edits itself. `undefined` when none. */
export function outermostProseBlock(path: Nodes[]): ProseBlock | undefined {
  return path.find(isProseBlock);
}

/** The inline variant's structural contract: a flat run of phrasing content (an inline component's
 *  children) the widget edits in place as a single line. */
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
