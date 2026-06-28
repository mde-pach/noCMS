// A click resolves to the deepest mdast node, often a raw text/emphasis node the owner can't act
// on; instead select the nearest meaningful node from the root→deepest path: a JSX component or a
// content block.

import type { Nodes } from "mdast";
import { nearestOfType } from "./position.js";

/** JSX component nodes — the curated bricks the owner places and configures. */
export const JSX_TYPES = ["mdxJsxFlowElement", "mdxJsxTextElement"] as const;

/** Content blocks — the structural units of prose between components. */
export const BLOCK_TYPES = [
  "heading",
  "paragraph",
  "list",
  "listItem",
  "blockquote",
  "thematicBreak",
  "code",
  "table",
] as const;

export const SELECTABLE_TYPES: readonly string[] = [...JSX_TYPES, ...BLOCK_TYPES];

/**
 * The most specific selectable node in a root→deepest path: the nearest JSX
 * component or block, scanning deepest-first. Undefined when the path holds nothing
 * selectable (e.g. a click outside any block).
 */
export function selectableNode(path: readonly Nodes[]): Nodes | undefined {
  return nearestOfType(path, SELECTABLE_TYPES);
}
