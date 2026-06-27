// Drag-to-reorder, factored out of the shell as a self-contained controller. It owns the drag
// state (which block is lifted), the "pop out" visuals (a 1px transparent native ghost so the
// real block is what lifts, plus the drop-indicator line via the overlay layer), and the geometry
// that maps a pointer-y to a sibling gap. The reorder itself stays one tree-transform: the shell
// passes a `reorder` callback so this never touches the document model directly (one tree, one
// undo). Selection/insert/prose are all untouched — this only handles the drag gesture.

import type { Nodes, Parent } from "mdast";
import type { CanvasHandle } from "./canvas.js";
import { boundingRect } from "./canvas.js";
import { type BlockBox, destinationIndex, dropGapAt } from "./drag.js";
import type { MdxDocument } from "./mdx-document.js";
import type { OverlayLayer } from "./overlays.js";
import { type IndexPath, nodeAtIndexPath } from "./position.js";

function childrenOf(node: Nodes | undefined): Nodes[] {
  return node && "children" in node ? (node as Parent).children : [];
}

export interface DragController {
  /** start a drag from the current selection (the toolbar grip's `dragstart`). */
  beginDrag(event: DragEvent): void;
  /** end a drag, clearing the lift and indicator (the grip's `dragend`). */
  endDrag(): void;
  /** surface `dragover`: allow the drop and move the indicator line to the hovered gap. */
  onDragOver(event: DragEvent): void;
  /** surface `drop`: resolve the gap to a destination index and ask the shell to reorder. */
  onDrop(event: DragEvent): Promise<void>;
  /** true while a block is being dragged — the shell suppresses hover then. */
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
  /** move the node at `from` into `parent` at index `to`, then commit — the one tree-transform. */
  reorder: (from: IndexPath, parent: IndexPath, to: number) => Promise<void>;
}

export function createDragController(deps: DragControllerDeps): DragController {
  const {
    surface,
    overlays,
    toolbarHost,
    canvas,
    getDoc,
    selectedPath,
    elementAtPath,
  } = deps;
  let dragFrom: IndexPath | undefined;
  let draggedEl: HTMLElement | undefined;
  const dragGhost =
    typeof Image !== "undefined"
      ? new Image(1, 1)
      : (undefined as unknown as undefined);
  if (dragGhost) {
    dragGhost.src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  }

  // A component renders behind a `display:contents` carrier with no box of its own, so the lift
  // (transform + shadow) must land on the first element that actually generates a box.
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

  const siblingBoxes = (parentPath: IndexPath): BlockBox[] => {
    const siblings = childrenOf(nodeAtIndexPath(getDoc(), parentPath));
    const region = surface.getBoundingClientRect();
    const boxes: BlockBox[] = [];
    siblings.forEach((child, index) => {
      if (child.type === "yaml") return;
      const offset = child.position?.start.offset;
      const el =
        offset === undefined
          ? null
          : surface.querySelector(`[data-mdx-pos="${offset}"]`);
      if (!el) return;
      const rect = boundingRect(el);
      boxes.push({
        index,
        top: rect.top - region.top,
        bottom: rect.bottom - region.top,
      });
    });
    return boxes;
  };

  function beginDrag(event: DragEvent): void {
    const path = selectedPath();
    if (!path) return;
    dragFrom = path;
    if (event.dataTransfer) {
      event.dataTransfer.setData("text/plain", "");
      event.dataTransfer.effectAllowed = "move";
      if (dragGhost) event.dataTransfer.setDragImage(dragGhost, 0, 0);
    }
    const el = elementAtPath(path);
    const lift = el ? firstBox(el) : undefined;
    if (lift) {
      draggedEl = lift;
      lift.classList.add("nocms-dragging");
    }
    canvas.highlight(undefined);
    toolbarHost.style.display = "none";
    overlays.showSelectionLabel(undefined, undefined);
    overlays.clearHover();
  }

  function endDrag(): void {
    dragFrom = undefined;
    draggedEl?.classList.remove("nocms-dragging");
    draggedEl = undefined;
    overlays.showDropLine(undefined);
  }

  function onDragOver(event: DragEvent): void {
    if (!dragFrom) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    const parentPath = dragFrom.slice(0, -1);
    const boxes = siblingBoxes(parentPath);
    const region = surface.getBoundingClientRect();
    const gap = dropGapAt(boxes, event.clientY - region.top);
    const before = boxes.find((b) => b.index === gap);
    const after = [...boxes].reverse().find((b) => b.index === gap - 1);
    overlays.showDropLine(before ? before.top : after ? after.bottom : 0);
  }

  async function onDrop(event: DragEvent): Promise<void> {
    if (!dragFrom || dragFrom.length === 0) return;
    event.preventDefault();
    const parentPath = dragFrom.slice(0, -1);
    const from = dragFrom[dragFrom.length - 1] ?? 0;
    const region = surface.getBoundingClientRect();
    const gap = dropGapAt(siblingBoxes(parentPath), event.clientY - region.top);
    const to = destinationIndex(from, gap);
    endDrag();
    if (to === undefined) return;
    await deps.reorder([...parentPath, from], parentPath, to);
  }

  return {
    beginDrag,
    endDrag,
    onDragOver,
    onDrop,
    isDragging: () => dragFrom !== undefined,
  };
}
