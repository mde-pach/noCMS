// The contextual toolbar shown on the selected block (§1 of the shell spec): the block
// name as a node tag plus the structural actions every block shares — reorder, delete,
// insert after, and a drag handle. It is type-agnostic: the same four actions apply to a
// Hero, a heading, or a plugin block, because each is one node in the uniform tree. A
// pure presenter — it raises intent; the shell turns each into a tree-transform.
//
// Each action stops the click propagating: the toolbar floats over the canvas, whose
// click handler would otherwise read the click as empty space and deselect the very
// block being acted on.

import type { VNode } from "preact";

export interface SelectionToolbarProps {
  label: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onInsert: () => void;
  /** native HTML5 drag-reorder; the shell resolves the drop to a `moveNode`. */
  onDragStart: (event: DragEvent) => void;
  onDragEnd: (event: DragEvent) => void;
}

const act = (fn: () => void) => (event: MouseEvent) => {
  event.stopPropagation();
  fn();
};

export function SelectionToolbar({
  label,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onDelete,
  onInsert,
  onDragStart,
  onDragEnd,
}: SelectionToolbarProps): VNode {
  return (
    <div class="nocms-toolbar">
      <button
        type="button"
        class="nocms-tool-drag"
        draggable
        title="Drag to reorder"
        onClick={(event) => event.stopPropagation()}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        ⠿
      </button>
      <span class="nocms-tool-tag">{label}</span>
      <button
        type="button"
        class="nocms-tool-up"
        title="Move up"
        disabled={!canMoveUp}
        onClick={act(onMoveUp)}
      >
        ↑
      </button>
      <button
        type="button"
        class="nocms-tool-down"
        title="Move down"
        disabled={!canMoveDown}
        onClick={act(onMoveDown)}
      >
        ↓
      </button>
      <button
        type="button"
        class="nocms-tool-insert"
        title="Insert after"
        onClick={act(onInsert)}
      >
        +
      </button>
      <button
        type="button"
        class="nocms-tool-delete"
        title="Delete"
        onClick={act(onDelete)}
      >
        🗑
      </button>
    </div>
  );
}
