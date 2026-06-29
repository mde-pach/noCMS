// Block-level formatting for a selected prose block: the kinds a paragraph/heading/list/blockquote
// can become, and the one transform that converts between them. Editing the inline *content* is the
// prose session's job (ProseMirror, in place); this is the structural half — turning a paragraph
// into a heading, wrapping it in a list or a quote, and back — done by rebuilding the mdast node and
// letting the document store re-serialize + repaint.
//
// Conversions preserve all text: a block's inline content is gathered into one group per paragraph
// (recursing through quotes and list items), then re-emitted in the target shape. Structure can
// flatten (a multi-item list → one paragraph per item), but no words are lost.

import type {
  BlockContent,
  Blockquote,
  Heading,
  List,
  ListItem,
  Nodes,
  Paragraph,
  Parent,
  PhrasingContent,
} from "mdast";
import { type IndexPath, nodeAtIndexPath } from "./position.js";

export type BlockKind =
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "bulleted"
  | "numbered"
  | "quote";

/** The block kind of a node, or `undefined` when it isn't a formattable prose block (a component,
 *  a thematic break, …). */
export function blockKindOf(node: Nodes | undefined): BlockKind | undefined {
  if (!node) return undefined;
  if (node.type === "paragraph") return "paragraph";
  if (node.type === "heading") return `h${(node as Heading).depth}` as BlockKind;
  if (node.type === "blockquote") return "quote";
  if (node.type === "list") return (node as List).ordered ? "numbered" : "bulleted";
  return undefined;
}

export const isProseBlock = (node: Nodes | undefined): boolean =>
  blockKindOf(node) !== undefined;

const HEADING_DEPTH: Record<string, Heading["depth"]> = {
  h1: 1,
  h2: 2,
  h3: 3,
  h4: 4,
  h5: 5,
  h6: 6,
};

/** Each paragraph of inline content inside `node`, as one group of phrasing children — recursing
 *  through quotes and list items so converting away from them keeps every word. */
function inlineGroups(node: Nodes): PhrasingContent[][] {
  if (node.type === "paragraph" || node.type === "heading") {
    return [(node as Paragraph | Heading).children];
  }
  if (node.type === "blockquote" || node.type === "listItem" || node.type === "list") {
    return (node as Parent).children.flatMap((child) => inlineGroups(child as Nodes));
  }
  return [];
}

function paragraphsFrom(groups: PhrasingContent[][]): Paragraph[] {
  return groups.map((children) => ({ type: "paragraph", children }));
}

/** Build the replacement node(s) for `groups` in the target shape. A text kind emits one node per
 *  group; a quote/list wraps every group into one container. */
function build(target: BlockKind, groups: PhrasingContent[][]): BlockContent[] {
  if (target === "paragraph") return paragraphsFrom(groups);
  const depth = HEADING_DEPTH[target];
  if (depth) {
    return groups.map((children) => ({ type: "heading", depth, children }));
  }
  if (target === "quote") {
    const quote: Blockquote = { type: "blockquote", children: paragraphsFrom(groups) };
    return [quote];
  }
  const list: List = {
    type: "list",
    ordered: target === "numbered",
    children: groups.map(
      (children): ListItem => ({
        type: "listItem",
        children: [{ type: "paragraph", children }],
      }),
    ),
  };
  return [list];
}

/** Reformat the prose block at `path` to `target`, mutating `doc` in place. Returns true when the
 *  block was a formattable prose block (and was rewritten), false otherwise. The caller serialises +
 *  commits; selection at `path` re-pins to the first replacement node. */
export function setBlock(doc: Nodes, path: IndexPath, target: BlockKind): boolean {
  if (path.length === 0) return false;
  const node = nodeAtIndexPath(doc, path);
  if (!node || !isProseBlock(node)) return false;
  const parent = nodeAtIndexPath(doc, path.slice(0, -1)) as Parent | undefined;
  const index = path[path.length - 1];
  if (!parent || index === undefined) return false;

  const groups = inlineGroups(node);
  if (groups.length === 0) return false;
  parent.children.splice(index, 1, ...build(target, groups));
  return true;
}
