// Each action stops propagation so the canvas click handler doesn't read it as empty space and
// deselect the block being acted on.

import type { VNode } from "preact";
import {
  ArrowDown,
  ArrowUp,
  DuplicateIcon,
  GripIcon,
  SectionIcon,
  SettingsIcon,
  TrashIcon,
} from "./icons.js";

export interface SelectionToolbarProps {
  label: string;
  /** when given, the leading name segment becomes the drag handle (grip + name) that lifts the
   *  block to move it — so the label and the actions are one pill, not a chip beside a bar. */
  onGrab?: (event: PointerEvent) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSettings: () => void;
  /** promote the selected block into a reusable saved component; absent when the block
   *  can't be saved (e.g. plain prose with no controls). */
  onSaveAsComponent?: () => void;
}

const act = (fn: () => void) => (event: MouseEvent) => {
  event.stopPropagation();
  fn();
};

export function SelectionToolbar({
  label,
  onGrab,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onSettings,
  onSaveAsComponent,
}: SelectionToolbarProps): VNode {
  return (
    <div
      class="nocms-toolbar nocms-toolbar--float"
      role="toolbar"
      aria-label={`${label} actions`}
    >
      <span
        class="nc-tool-handle"
        role={onGrab ? "button" : undefined}
        title={onGrab ? "Drag to move" : undefined}
        onPointerDown={onGrab}
      >
        <GripIcon size={9} class="nc-tool-grip" />
        <span class="nc-tool-label">{label}</span>
      </span>
      <span class="nc-tool-sep" />
      <button
        type="button"
        class="nocms-tool-up"
        title="Move up"
        aria-label="Move up"
        disabled={!canMoveUp}
        onClick={act(onMoveUp)}
      >
        <ArrowUp size={14} />
      </button>
      <button
        type="button"
        class="nocms-tool-down"
        title="Move down"
        aria-label="Move down"
        disabled={!canMoveDown}
        onClick={act(onMoveDown)}
      >
        <ArrowDown size={14} />
      </button>
      <span class="nc-tool-sep" />
      <button
        type="button"
        class="nocms-tool-duplicate"
        title="Duplicate"
        aria-label="Duplicate"
        onClick={act(onDuplicate)}
      >
        <DuplicateIcon size={13} />
      </button>
      <button
        type="button"
        class="nocms-tool-delete"
        title="Delete"
        aria-label="Delete"
        onClick={act(onDelete)}
      >
        <TrashIcon size={13} />
      </button>
      <span class="nc-tool-sep" />
      {onSaveAsComponent ? (
        <button
          type="button"
          class="nocms-tool-save-component"
          title="Save as component"
          aria-label="Save as component"
          onClick={act(onSaveAsComponent)}
        >
          <SectionIcon size={13} />
        </button>
      ) : null}
      <button
        type="button"
        class="nocms-tool-settings"
        title="Settings"
        aria-label="Settings"
        onClick={act(onSettings)}
      >
        <SettingsIcon size={13} />
      </button>
    </div>
  );
}
