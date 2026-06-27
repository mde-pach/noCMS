// The geometry half of drag-reorder, kept pure so it is testable without a layout
// engine. The shell measures the dragged node's siblings into boxes and asks which
// gap a pointer at `y` falls into; the move itself is a `moveNode` tree-transform
// (drag carries no model of its own — one tree, one undo). No block type is consulted:
// any sibling reorders the same way.

export interface BlockBox {
  /** the child's index among its siblings */
  index: number;
  top: number;
  bottom: number;
}

/**
 * The child index a drop at vertical position `y` resolves to, in the parent's own
 * index space: the first box's index when `y` is above every block, one past the last
 * box's index when below them all, and `box.index + 1` once `y` clears a block's
 * midpoint. Boxes carry their real `index`, so a leading non-block sibling that isn't
 * measured (e.g. frontmatter) is never a drop target — the first reorder slot is the
 * first measured block. `boxes` are assumed in document (index) order.
 */
export function dropGapAt(boxes: readonly BlockBox[], y: number): number {
  const first = boxes[0];
  if (!first) return 0;
  let gap = first.index;
  for (const box of boxes) {
    if (y > (box.top + box.bottom) / 2) gap = box.index + 1;
    else break;
  }
  return gap;
}

/**
 * The destination index a move into `gap` resolves to once the dragged item at `from`
 * has been removed: dropping into a gap after the original slot shifts left by one.
 * Returns undefined for a no-op drop (back into its own slot).
 */
export function destinationIndex(from: number, gap: number): number | undefined {
  if (gap === from || gap === from + 1) return undefined;
  return gap > from ? gap - 1 : gap;
}
