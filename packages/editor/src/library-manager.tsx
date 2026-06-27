import type { VNode } from "preact";
import { CheckIcon, PlusIcon } from "./icons.js";

export interface LibraryEntry {
  id: string;
  name: string;
  version: string;
  verified: boolean;
  blocks: number;
  description: string;
  builtin: boolean;
}

export interface LibraryManagerProps {
  libraries: LibraryEntry[];
  onBack: () => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}

function LibraryCard({
  entry,
  onRemove,
}: {
  entry: LibraryEntry;
  onRemove: (id: string) => void;
}): VNode {
  return (
    <div class="nc-lib-card">
      <div class="nc-lib-head">
        <div class="nc-lib-name">{entry.name}</div>
        <div class="nc-lib-meta">
          <span class="nc-mono">v{entry.version}</span>
          {entry.verified ? (
            <span class="nc-lib-verified">
              <CheckIcon size={11} /> Verified
            </span>
          ) : null}
          <span class="nc-mono">{entry.blocks} blocks</span>
        </div>
      </div>
      <p class="nc-lib-desc">{entry.description}</p>
      <div class="nc-lib-foot">
        {entry.builtin ? (
          <span class="nc-lib-builtin nc-mono">Built in</span>
        ) : (
          <button
            type="button"
            class="nc-btn-ghost"
            style="padding:7px 14px"
            onClick={() => onRemove(entry.id)}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

export function LibraryManager({
  libraries,
  onBack,
  onAdd,
  onRemove,
}: LibraryManagerProps): VNode {
  return (
    <div class="nocms-editor nc-lib-root">
      <div class="nocms-topbar">
        <button type="button" class="nc-link" onClick={onBack}>
          ← Back to editor
        </button>
      </div>
      <div class="nc-lib-body">
        <div class="nc-lib-column">
          <div class="nc-lib-titlerow">
            <div>
              <div class="nc-sheet-title">Libraries</div>
              <div class="nc-sheet-sub">
                Manage the section libraries installed in this site.
              </div>
            </div>
            <button
              type="button"
              class="nc-btn-primary"
              style="width:auto;padding:9px 16px"
              onClick={onAdd}
            >
              <PlusIcon size={14} /> Add a library
            </button>
          </div>
          {libraries.map((entry) => (
            <LibraryCard key={entry.id} entry={entry} onRemove={onRemove} />
          ))}
          <button type="button" class="nc-lib-add" onClick={onAdd}>
            <PlusIcon size={15} />
            Add a library from a Git URL or the registry
          </button>
        </div>
      </div>
    </div>
  );
}
