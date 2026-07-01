// The block kinds a prose block can be, and how to read the kind off an mdast node — used to label
// the selected block and light up the active control in the panel. Changing the kind is the live
// editor's job (`@nocms/prose` setProseBlock on the in-place editor), so there is one mechanism: the
// block-aware editor. This module only *reads* structure, it never rewrites it.

import type { ProseBlockName } from "@nocms/prose";
import type { Heading, List, Nodes } from "mdast";

/** The block kinds the panel labels — the same vocabulary the live editor drives (one type). */
export type BlockKind = ProseBlockName;

/** True when a list is a GFM task list — its items carry checkboxes (`checked` set, not null). */
function isTaskList(list: List): boolean {
  return list.children.some((item) => item.checked === true || item.checked === false);
}

/** The block kind of a node, or `undefined` when it isn't a formattable prose block (a component,
 *  a thematic break, …). */
export function blockKindOf(node: Nodes | undefined): BlockKind | undefined {
  if (!node) return undefined;
  if (node.type === "paragraph") return "paragraph";
  if (node.type === "heading") return `h${(node as Heading).depth}` as BlockKind;
  if (node.type === "blockquote") return "quote";
  if (node.type === "list") {
    const list = node as List;
    if (isTaskList(list)) return "todo";
    return list.ordered ? "numbered" : "bulleted";
  }
  return undefined;
}

export const isProseBlock = (node: Nodes | undefined): boolean =>
  blockKindOf(node) !== undefined;
