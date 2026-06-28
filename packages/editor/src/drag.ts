// The geometry half of drag-reorder, kept pure so it is testable without a layout engine.

export interface BlockBox {
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

// Cross-container resolution. A drag can land in any droppable container, not just the source's
// own parent, so the geometry generalizes from "a column of sibling boxes" to "a set of measured
// containers, each flowing along its own axis". Still pure: the controller measures the DOM into
// these boxes (in the surface's content coordinate space) and this half decides where a point lands.

export type Axis = "vertical" | "horizontal";

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** A measured child of a container, carrying its real index in the container's child array. */
export interface ChildBox {
  index: number;
  box: Box;
}

/** A droppable container measured once at lift. `path` is `[]` for the document root. `axis` is the
 *  direction its children flow, so the insertion line is drawn across the other axis. */
export interface DropZone {
  path: readonly number[];
  axis: Axis;
  box: Box;
  children: readonly ChildBox[];
}

/** Where a drop would land plus what to draw: an insertion line segment and the container to ring. */
export interface DropTarget {
  parentPath: readonly number[];
  /** gap index in the container's own child-index space. */
  index: number;
  line: { orientation: Axis; x: number; y: number; length: number };
  container: Box;
}

const contains = (b: Box, x: number, y: number): boolean =>
  x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;

const area = (b: Box): number => (b.right - b.left) * (b.bottom - b.top);

/** True when `prefix` addresses `path` or one of its ancestors (so `path` lies in its subtree). */
const startsWith = (path: readonly number[], prefix: readonly number[]): boolean =>
  prefix.length <= path.length && prefix.every((v, i) => v === path[i]);

/** The gap a point falls into among `children` flowing along `axis`, in the container's index
 *  space (so a leading unmeasured sibling like frontmatter is never a target). Mirrors `dropGapAt`
 *  but reads the coordinate off the axis. Children are assumed in document (index) order. */
function gapAlong(
  children: readonly ChildBox[],
  axis: Axis,
  x: number,
  y: number,
): number {
  const first = children[0];
  if (!first) return 0;
  let gap = first.index;
  for (const child of children) {
    const mid =
      axis === "vertical"
        ? (child.box.top + child.box.bottom) / 2
        : (child.box.left + child.box.right) / 2;
    if ((axis === "vertical" ? y : x) > mid) gap = child.index + 1;
    else break;
  }
  return gap;
}

/** The insertion line for `gap` within `zone`: spanning the container on the cross-axis, placed in
 *  the gutter between the children on either side (centered when the container is empty). */
function lineFor(zone: DropZone, gap: number): DropTarget["line"] {
  const before = [...zone.children].reverse().find((c) => c.index === gap - 1);
  const after = zone.children.find((c) => c.index === gap);
  if (zone.axis === "vertical") {
    const y = after
      ? before
        ? (before.box.bottom + after.box.top) / 2
        : after.box.top
      : before
        ? before.box.bottom
        : (zone.box.top + zone.box.bottom) / 2;
    return {
      orientation: "horizontal",
      x: zone.box.left,
      y,
      length: zone.box.right - zone.box.left,
    };
  }
  const x = after
    ? before
      ? (before.box.right + after.box.left) / 2
      : after.box.left
    : before
      ? before.box.right
      : (zone.box.left + zone.box.right) / 2;
  return {
    orientation: "vertical",
    x,
    y: zone.box.top,
    length: zone.box.bottom - zone.box.top,
  };
}

/**
 * The drop a point resolves to: the deepest container whose box holds the point and that is not
 * inside the dragged subtree (you cannot drop a node into itself or its own descendant). Ties on
 * depth break to the smaller box — the more specific region. Returns undefined when the point is
 * over no droppable container.
 */
export function resolveDrop(
  zones: readonly DropZone[],
  x: number,
  y: number,
  draggedPath: readonly number[],
): DropTarget | undefined {
  let best: DropZone | undefined;
  for (const zone of zones) {
    if (!contains(zone.box, x, y) || startsWith(zone.path, draggedPath)) continue;
    if (
      !best ||
      zone.path.length > best.path.length ||
      (zone.path.length === best.path.length && area(zone.box) < area(best.box))
    ) {
      best = zone;
    }
  }
  if (!best) return undefined;
  const index = gapAlong(best.children, best.axis, x, y);
  return {
    parentPath: best.path,
    index,
    line: lineFor(best, index),
    container: best.box,
  };
}
