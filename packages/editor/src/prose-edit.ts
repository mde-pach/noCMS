// Which selected nodes can be edited in place by the prose widget (@nocms/prose). The
// widget edits a single block's *inline* content (a flat `PhrasingContent[]`), so the
// editable blocks are exactly the ones whose children are phrasing content: paragraphs and
// headings. Lists, code, and blockquotes are containers of blocks, not prose spans — they
// are selected and configured, not typed into directly.

import type { Heading, Nodes, Paragraph } from "mdast";

export type ProseBlock = Paragraph | Heading;

export function isProseEditable(node: Nodes): node is ProseBlock {
  return node.type === "paragraph" || node.type === "heading";
}
