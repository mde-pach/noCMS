// Drag-to-arrange, factored out of the shell as a self-contained controller. The gesture is built
// on pointer events (not native HTML5 drag) so the lifted thing can be a styled clone that rides
// the cursor while the original dims in place, and so the drop indicator can be a rich, axis-aware
// affordance. It owns the drag state, the "detached preview" visuals, auto-scroll, and the snapshot
// of drop zones measured once at lift; the geometry that maps a point to a zone+gap lives in
// `drag.ts` (pure).
//
// Two things can be dragged, captured by a `DragSession`: a **block** (an MDX node, droppable into
// any container — one tree-transform) and an **item** (one element of a component's object-array
// prop, reordered within its own array — one prop write). The shell passes the commit for each, so
// this never touches the document model directly (one undo step either way).

import type { Nodes, Parent } from "mdast";
import type { CanvasHandle } from "./canvas.js";
import { boundingRect } from "./canvas.js";
import {
  type Axis,
  type Box,
  type ChildBox,
  type DropTarget,
  type DropZone,
  destinationIndex,
  resolveDrop,
} from "./drag.js";
import type { ItemSelection } from "./item-selection.js";
import type { MdxDocument } from "./mdx-document.js";
import type { OverlayLayer } from "./overlays.js";
import type { IndexPath } from "./position.js";

// Pointer travel before a press on the chip becomes a drag, so a bare click on the handle is inert.
const LIFT_THRESHOLD = 4;
// Edge band (px from the viewport edge) where the canvas auto-scrolls, and the peak step per frame.
const SCROLL_MARGIN = 56;
const SCROLL_MAX = 20;
// A `draggedPath` that is never a prefix of a real zone path — so item drags (single zone at `[]`)
// exclude nothing, while a block drag passes its own path to exclude its subtree.
const NO_EXCLUDE: IndexPath = [-1];

function childrenOf(node: Nodes | undefined): Nodes[] {
  return node && "children" in node ? (node as Parent).children : [];
}

interface DragSession {
  /** the element to clone + dim, resolved at lift (after a repaint can't intervene). */
  liftElement: () => Element | null;
  /** the drop zones, measured once at lift. */
  buildZones: () => DropZone[];
  /** passed to `resolveDrop` to keep a drag out of its own subtree. */
  draggedPath: IndexPath;
  /** apply the resolved drop and commit. */
  commit: (target: DropTarget) => Promise<void>;
}

export interface DragController {
  /** start a block drag from the current selection — the block chip's `pointerdown`. */
  beginDrag(event: PointerEvent): void;
  /** start an item drag from the selected array item — the item chip's `pointerdown`. */
  beginItemDrag(event: PointerEvent): void;
  /** cancel/teardown an in-flight drag (also called on shell dispose). */
  endDrag(): void;
  /** true once a drag is actually lifted — the shell suppresses hover then. */
  isDragging(): boolean;
}

export interface DragControllerDeps {
  surface: HTMLElement;
  overlays: OverlayLayer;
  toolbarHost: HTMLElement;
  canvas: CanvasHandle;
  getDoc: () => MdxDocument;
  selectedPath: () => IndexPath | undefined;
  elementAtPath: (path: IndexPath) => Element | null;
  /** true when a JSX component declares slots, i.e. is a droppable container. */
  isContainer: (name: string) => boolean;
  /** move the node at `from` into `parent` at index `to`, then commit — the one tree-transform. */
  reorder: (from: IndexPath, parent: IndexPath, to: number) => Promise<void>;
  /** the currently selected array item, if an item (not a block) is selected. */
  selectedItem: () => ItemSelection | undefined;
  /** the card element of an array item on the canvas. */
  itemElement: (item: ItemSelection) => Element | null;
  /** reorder the item's array to put it at index `to`, then commit — the one prop write. */
  reorderItems: (item: ItemSelection, to: number) => Promise<void>;
  /** re-pin the selection chrome (highlight, toolbar, chip) after a cancelled or finished drag. */
  restore: () => void;
}

export function createDragController(deps: DragControllerDeps): DragController {
  const {
    surface,
    overlays,
    canvas,
    toolbarHost,
    getDoc,
    selectedPath,
    elementAtPath,
  } = deps;

  let session: DragSession | undefined;
  let origin = { x: 0, y: 0 };
  let last = { x: 0, y: 0 };
  let lifted = false;
  let zones: DropZone[] = [];
  let target: DropTarget | undefined;
  let ghost: HTMLElement | undefined;
  let sourceEl: HTMLElement | undefined;
  let grab = { x: 0, y: 0 };
  let scrollRaf: number | undefined;
  let scrollV = 0;

  // A component renders behind a `display:contents` carrier with no box of its own, so the lift
  // (clone + dim) must land on the first element that actually generates a box.
  const firstBox = (el: Element): HTMLElement | undefined => {
    if (el instanceof HTMLElement) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 || rect.height > 0) return el;
    }
    for (const child of el.children) {
      const found = firstBox(child);
      if (found) return found;
    }
    return undefined;
  };

  // A box in the surface's content coordinate space (scroll-independent), so zones measured at lift
  // stay valid as the page (auto-)scrolls; the pointer is converted to the same space each move.
  const toContentBox = (r: DOMRect): Box => {
    const region = surface.getBoundingClientRect();
    return {
      left: r.left - region.left + surface.scrollLeft,
      top: r.top - region.top + surface.scrollTop,
      right: r.right - region.left + surface.scrollLeft,
      bottom: r.bottom - region.top + surface.scrollTop,
    };
  };

  const isContainerNode = (node: Nodes): boolean =>
    node.type === "mdxJsxFlowElement" &&
    typeof (node as { name?: unknown }).name === "string" &&
    deps.isContainer((node as { name: string }).name);

  // A container's main axis decides which way the insertion line runs: a row/grid flows children
  // horizontally (so a vertical line between columns), everything else vertically.
  const axisOf = (el: Element): Axis => {
    const cs = getComputedStyle(el);
    if (cs.display.includes("grid")) return "horizontal";
    if (cs.display.includes("flex"))
      return cs.flexDirection.startsWith("row") ? "horizontal" : "vertical";
    return "vertical";
  };

  // Every droppable container in the document, measured once. Built after the source is dimmed
  // (opacity only, no reflow) and the clone is detached (position:fixed), so the geometry is stable.
  function blockZones(): DropZone[] {
    const doc = getDoc();
    const elFor = (offset: number | undefined): Element | null =>
      offset === undefined ? null : surface.querySelector(`[data-mdx-pos="${offset}"]`);
    const childBoxes = (node: Nodes): ChildBox[] => {
      const out: ChildBox[] = [];
      childrenOf(node).forEach((child, index) => {
        if (child.type === "yaml") return;
        const el = elFor(child.position?.start.offset);
        if (el) out.push({ index, box: toContentBox(boundingRect(el)) });
      });
      return out;
    };

    const result: DropZone[] = [
      {
        path: [],
        axis: "vertical",
        box: {
          left: 0,
          top: 0,
          right: surface.scrollWidth,
          bottom: surface.scrollHeight,
        },
        children: childBoxes(doc),
      },
    ];
    const walk = (node: Nodes, path: number[]): void => {
      childrenOf(node).forEach((child, index) => {
        const childPath = [...path, index];
        if (isContainerNode(child)) {
          const el = elFor(child.position?.start.offset);
          const lift = el ? (firstBox(el) ?? el) : undefined;
          if (el && lift) {
            result.push({
              path: childPath,
              axis: axisOf(lift),
              box: toContentBox(boundingRect(el)),
              children: childBoxes(child),
            });
          }
        }
        walk(child, childPath);
      });
    };
    walk(doc, []);
    return result;
  }

  // One zone: the array the item belongs to, its children the sibling item cards. A drop only ever
  // reorders within this array, so there is a single droppable region.
  function itemZones(item: ItemSelection): DropZone[] {
    const itemEl = deps.itemElement(item);
    const container = itemEl?.parentElement;
    if (!itemEl || !container) return [];
    const scope = itemEl.closest("[data-mdx-pos]") ?? container;
    const children: ChildBox[] = [];
    for (const el of scope.querySelectorAll(`[data-nocms-item^="${item.key}."]`)) {
      const raw = (el as HTMLElement).dataset.nocmsItem ?? "";
      const index = Number(raw.slice(raw.lastIndexOf(".") + 1));
      if (Number.isInteger(index))
        children.push({ index, box: toContentBox(boundingRect(el)) });
    }
    if (children.length === 0) return [];
    children.sort((a, b) => a.index - b.index);
    return [
      {
        path: [],
        axis: axisOf(container),
        box: toContentBox(boundingRect(container)),
        children,
      },
    ];
  }

  function makeGhost(el: HTMLElement, event: PointerEvent): void {
    const rect = el.getBoundingClientRect();
    const clone = el.cloneNode(true) as HTMLElement;
    clone.classList.add("nocms-drag-ghost");
    clone.style.left = `${rect.left}px`;
    clone.style.top = `${rect.top}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    grab = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    document.body.appendChild(clone);
    ghost = clone;
  }

  function moveGhost(x: number, y: number): void {
    if (!ghost) return;
    ghost.style.left = `${x - grab.x}px`;
    ghost.style.top = `${y - grab.y}px`;
  }

  function updateTarget(): void {
    if (!session) return;
    const region = surface.getBoundingClientRect();
    const x = last.x - region.left + surface.scrollLeft;
    const y = last.y - region.top + surface.scrollTop;
    target = resolveDrop(zones, x, y, session.draggedPath);
    overlays.showDropIndicator(
      target ? { line: target.line, container: target.container } : undefined,
    );
  }

  // Auto-scroll when the pointer sits in the top/bottom edge band, so a drag can reach off-screen
  // targets. Whichever element actually scrolls (the canvas surface or the page) is scrolled; the
  // target is re-resolved against the new scroll so the indicator tracks under a still pointer.
  const scroller = (): Element =>
    surface.scrollHeight > surface.clientHeight
      ? surface
      : (document.scrollingElement ?? document.documentElement);

  function updateAutoScroll(y: number): void {
    const fromTop = y;
    const fromBottom = window.innerHeight - y;
    if (fromTop < SCROLL_MARGIN) scrollV = -SCROLL_MAX * (1 - fromTop / SCROLL_MARGIN);
    else if (fromBottom < SCROLL_MARGIN)
      scrollV = SCROLL_MAX * (1 - fromBottom / SCROLL_MARGIN);
    else scrollV = 0;
    if (scrollV !== 0 && scrollRaf === undefined)
      scrollRaf = requestAnimationFrame(stepScroll);
  }

  function stepScroll(): void {
    scrollRaf = undefined;
    if (!lifted || scrollV === 0) return;
    scroller().scrollTop += scrollV;
    updateTarget();
    scrollRaf = requestAnimationFrame(stepScroll);
  }

  function lift(event: PointerEvent): void {
    if (!session) return;
    lifted = true;
    const el = session.liftElement();
    const box = el ? firstBox(el) : undefined;
    if (box) {
      sourceEl = box;
      box.classList.add("nocms-drag-source");
      makeGhost(box, event);
    }
    zones = session.buildZones();
    canvas.highlight(undefined);
    toolbarHost.style.display = "none";
    overlays.showSelectionLabel(undefined, undefined);
    overlays.clearHover();
  }

  function onPointerMove(event: PointerEvent): void {
    if (!session) return;
    last = { x: event.clientX, y: event.clientY };
    if (!lifted) {
      if (
        Math.hypot(event.clientX - origin.x, event.clientY - origin.y) < LIFT_THRESHOLD
      )
        return;
      lift(event);
    }
    event.preventDefault();
    moveGhost(event.clientX, event.clientY);
    updateTarget();
    updateAutoScroll(event.clientY);
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      teardown();
    }
  }

  async function onPointerUp(): Promise<void> {
    const active = session;
    const drop = lifted ? target : undefined;
    teardown();
    if (active && drop) await active.commit(drop);
  }

  // Clears all drag state and listeners and re-pins the selection chrome. Used by both the drop
  // path (after `target` is read) and cancellation, so the editor is never left mid-drag.
  function teardown(): void {
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("keydown", onKeyDown);
    if (scrollRaf !== undefined) cancelAnimationFrame(scrollRaf);
    scrollRaf = undefined;
    scrollV = 0;
    ghost?.remove();
    ghost = undefined;
    sourceEl?.classList.remove("nocms-drag-source");
    sourceEl = undefined;
    overlays.showDropIndicator(undefined);
    const wasLifted = lifted;
    session = undefined;
    lifted = false;
    target = undefined;
    zones = [];
    if (wasLifted) deps.restore();
  }

  function start(event: PointerEvent, next: DragSession): void {
    event.preventDefault();
    event.stopPropagation();
    session = next;
    origin = { x: event.clientX, y: event.clientY };
    last = origin;
    lifted = false;
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("keydown", onKeyDown);
  }

  function beginDrag(event: PointerEvent): void {
    const path = selectedPath();
    if (!path || path.length === 0) return;
    start(event, {
      liftElement: () => elementAtPath(path),
      buildZones: blockZones,
      draggedPath: path,
      commit: async (drop) => {
        const parent = [...drop.parentPath];
        const sameParent = parent.join() === path.slice(0, -1).join();
        // Cross-parent: the destination index is unaffected by removing the source. Same parent:
        // the gap is in pre-removal index space, so shift it (and no-op back into its own slot).
        const to = sameParent
          ? destinationIndex(path[path.length - 1] ?? 0, drop.index)
          : drop.index;
        if (to !== undefined) await deps.reorder(path, parent, to);
      },
    });
  }

  function beginItemDrag(event: PointerEvent): void {
    const item = deps.selectedItem();
    if (!item) return;
    start(event, {
      liftElement: () => deps.itemElement(item),
      buildZones: () => itemZones(item),
      draggedPath: NO_EXCLUDE,
      commit: async (drop) => {
        // The item stays in the array during the drag, so the gap is in pre-removal index space —
        // the same left-shift a same-parent block reorder needs.
        const to = destinationIndex(item.index, drop.index);
        if (to !== undefined) await deps.reorderItems(item, to);
      },
    });
  }

  return {
    beginDrag,
    beginItemDrag,
    endDrag: teardown,
    isDragging: () => lifted,
  };
}
