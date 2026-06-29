// Each action stops propagation so the canvas click handler doesn't read it as empty space and
// deselect the block being acted on.

import type { VNode } from "preact";
import {
  ArrowDown,
  ArrowUp,
  DuplicateIcon,
  SectionIcon,
  SettingsIcon,
  TrashIcon,
} from "./icons.js";

export interface SelectionToolbarProps {
  label: string;
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
      class="nocms-toolbar nocms-toolbar--selection"
      role="toolbar"
      aria-label={`${label} actions`}
    >
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
