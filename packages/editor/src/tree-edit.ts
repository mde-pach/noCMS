// Each transform is a pure function from (tree, IndexPath) to a new tree. On an address that
// doesn't resolve, the input tree is returned unchanged, so a stale selection can never corrupt
// the document.

import type { Nodes, Parent } from "mdast";
import { type IndexPath, nodeAtIndexPath } from "./position.js";

function childrenOf(node: Nodes): Nodes[] | undefined {
  return "children" in node ? (node as Parent).children : undefined;
}

/** True when `a` addresses `b` or an ancestor of it — i.e. `a` is a prefix of `b`. */
function isPrefix(a: IndexPath, b: IndexPath): boolean {
  return a.length <= b.length && a.every((v, i) => v === b[i]);
}

/** The parent node and child index a non-empty path addresses, resolved within `root`. */
function locate(
  root: Nodes,
  path: IndexPath,
): { siblings: Nodes[]; index: number } | undefined {
  if (path.length === 0) return undefined;
  const parent = nodeAtIndexPath(root, path.slice(0, -1));
  const siblings = parent ? childrenOf(parent) : undefined;
  if (!siblings) return undefined;
  const index = path[path.length - 1] ?? -1;
  return index >= 0 && index < siblings.length ? { siblings, index } : undefined;
}

/** Insert `node` as the `index`-th child of the container at `parentPath` (clamped). */
export function insertAt<T extends Nodes>(
  root: T,
  parentPath: IndexPath,
  index: number,
  node: Nodes,
): T {
  const next = structuredClone(root);
  const parent = nodeAtIndexPath(next, parentPath);
  const siblings = parent ? childrenOf(parent) : undefined;
  if (!siblings) return root;
  siblings.splice(
    Math.max(0, Math.min(index, siblings.length)),
    0,
    structuredClone(node),
  );
  return next;
}

/** Remove the node at `path`. */
export function removeAt<T extends Nodes>(root: T, path: IndexPath): T {
  const next = structuredClone(root);
  const loc = locate(next, path);
  if (!loc) return root;
  loc.siblings.splice(loc.index, 1);
  return next;
}

/**
 * Move the node at `from` to be the `toIndex`-th child of the container at
 * `toParentPath`. `toIndex` is evaluated against the destination's children *after*
 * the source has been removed, so sibling reorder reads naturally: move-up is
 * `to = from - 1`, move-down is `to = from + 1`.
 */
export function moveNode<T extends Nodes>(
  root: T,
  from: IndexPath,
  toParentPath: IndexPath,
  toIndex: number,
): T {
  // Dropping a node into itself or its own descendant would detach the subtree from the
  // document; `from` being a prefix of the destination is exactly that case.
  if (isPrefix(from, toParentPath)) return root;
  const next = structuredClone(root);
  // Resolve the destination container by reference *before* removing the source. A source that
  // sits before the destination under a shared ancestor would otherwise shift the destination's
  // indices out from under `toParentPath`, silently dropping the move; the array reference is
  // stable across the splice. When source and destination share a parent it is the same array,
  // so removing then inserting at `toIndex` keeps the post-removal contract above.
  const destParent = nodeAtIndexPath(next, toParentPath);
  const dest = destParent ? childrenOf(destParent) : undefined;
  const loc = locate(next, from);
  if (!loc || !dest) return root;
  const [moved] = loc.siblings.splice(loc.index, 1);
  if (!moved) return root;
  dest.splice(Math.max(0, Math.min(toIndex, dest.length)), 0, moved);
  return next;
}

/** Reorder a child within its own parent (the common drag/keyboard case). */
export function moveChild<T extends Nodes>(
  root: T,
  parentPath: IndexPath,
  from: number,
  to: number,
): T {
  return moveNode(root, [...parentPath, from], parentPath, to);
}
