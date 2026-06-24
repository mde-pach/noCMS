// Maps a source offset back to the mdast node that produced it. The canvas renders
// the real component tree (the one renderer), each editable DOM element is stamped with
// its node's source offset, and a click resolves through here — selection is keyed on
// remark source positions, never on stringifying values and searching the DOM.

import type { Nodes, Parent } from "mdast";

function children(node: Nodes): Nodes[] {
  return "children" in node ? ((node as Parent).children as Nodes[]) : [];
}

function range(node: Nodes): { start: number; end: number } | undefined {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  return start === undefined || end === undefined ? undefined : { start, end };
}

/** True when `offset` falls within the node's half-open source range `[start, end)`. */
function contains(node: Nodes, offset: number): boolean {
  const r = range(node);
  return r !== undefined && offset >= r.start && offset < r.end;
}

/**
 * The chain of nodes whose source range contains `offset`, from the root down to the
 * most specific node. Empty if `offset` is outside the tree. The last element is the
 * deepest match; callers choose selection granularity by scanning the path (e.g. the
 * nearest JSX element, or the nearest block).
 */
export function nodeAtOffset(tree: Nodes, offset: number): Nodes[] {
  const path: Nodes[] = [];
  let current: Nodes | undefined = tree;
  while (current && contains(current, offset)) {
    path.push(current);
    current = children(current).find((child) => contains(child, offset));
  }
  return path;
}

/** The single most specific node at `offset`, or undefined if outside the tree. */
export function deepestNodeAtOffset(tree: Nodes, offset: number): Nodes | undefined {
  return nodeAtOffset(tree, offset).at(-1);
}

/** The nearest node in the path (deepest-first) matching one of `types`. */
export function nearestOfType(
  path: readonly Nodes[],
  types: readonly string[],
): Nodes | undefined {
  for (let i = path.length - 1; i >= 0; i--) {
    const node = path[i];
    if (node && types.includes(node.type)) return node;
  }
  return undefined;
}

/**
 * A node's structural address from the root: the child index at each level. Unlike a
 * source offset, it survives an edit that shifts offsets — the tree shape is unchanged
 * by a prop edit — so it's how the shell re-finds a selection across a re-render.
 */
export type IndexPath = number[];

/**
 * The index-path of `target` within a root→deepest node path (as `nodeAtOffset`
 * returns). `[]` when `target` is the root; undefined when it isn't in the path.
 */
export function indexPathOf(
  nodePath: readonly Nodes[],
  target: Nodes,
): IndexPath | undefined {
  const end = nodePath.indexOf(target);
  if (end === -1) return undefined;
  const indices: IndexPath = [];
  for (let i = 1; i <= end; i++) {
    const parent = nodePath[i - 1];
    const child = nodePath[i];
    if (!parent || !child) return undefined;
    const idx = children(parent).indexOf(child);
    if (idx === -1) return undefined;
    indices.push(idx);
  }
  return indices;
}

/** The node at an index-path from `root`, or undefined if the path doesn't resolve. */
export function nodeAtIndexPath(
  root: Nodes,
  indexPath: readonly number[],
): Nodes | undefined {
  let current: Nodes | undefined = root;
  for (const i of indexPath) {
    if (!current) return undefined;
    current = children(current)[i];
  }
  return current;
}
