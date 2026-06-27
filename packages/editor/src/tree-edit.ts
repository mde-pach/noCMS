// Structural transforms over the uniform mdast block tree (D15). Every canvas
// mutation that changes shape — insert, delete, reorder — is one of these: a pure
// function from (tree, address) to a *new* tree, addressed by IndexPath so it
// survives the source-offset shifts an edit causes. No transform inspects a block's
// type, so a brick added to the registry reorders, inserts, and deletes with zero
// changes here. On an address that doesn't resolve, the input tree is returned
// unchanged, so a stale selection can never corrupt the document.

import type { Nodes, Parent } from "mdast";
import { type IndexPath, nodeAtIndexPath } from "./position.js";

function childrenOf(node: Nodes): Nodes[] | undefined {
  return "children" in node ? (node as Parent).children : undefined;
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
  const next = structuredClone(root);
  const loc = locate(next, from);
  if (!loc) return root;
  const [moved] = loc.siblings.splice(loc.index, 1);
  if (!moved) return root;
  const parent = nodeAtIndexPath(next, toParentPath);
  const siblings = parent ? childrenOf(parent) : undefined;
  if (!siblings) return root;
  siblings.splice(Math.max(0, Math.min(toIndex, siblings.length)), 0, moved);
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
