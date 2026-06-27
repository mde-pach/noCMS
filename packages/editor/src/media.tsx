// The media picker: choose an image committed to the repo's /assets. A recently-used row,
// a grid with one selectable tile (slate ring + check), an upload tile, and Cancel/Insert.
// The shell opens it from any image control and writes the chosen URL back to that prop.
// Real upload/commit wires onto the GitHub client later; here it offers the repo's assets.

import type { VNode } from "preact";
import { useState } from "preact/hooks";
import { CheckIcon, CloseIcon, UploadIcon } from "./icons.js";

export interface MediaItem {
  url: string;
  name: string;
}

export interface MediaPickerProps {
  items: MediaItem[];
  onInsert: (url: string) => void;
  onClose: () => void;
}

function Tile({
  item,
  selected,
  onSelect,
}: {
  item: MediaItem;
  selected: boolean;
  onSelect: () => void;
}): VNode {
  return (
    <button
      type="button"
      class={`nc-media-tile${selected ? " nc-selected" : ""}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span class="nc-media-thumb" style={`background-image:url(${item.url})`} />
      {selected ? (
        <span class="nc-media-check">
          <CheckIcon size={12} />
        </span>
      ) : null}
      <span class="nc-media-name">{item.name}</span>
    </button>
  );
}

export function MediaPicker({ items, onInsert, onClose }: MediaPickerProps): VNode {
  const [selected, setSelected] = useState<string | undefined>(items[0]?.url);

  return (
    <div
      class="nc-scrim"
      role="button"
      tabIndex={-1}
      aria-label="Close"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div class="nc-sheet nc-media-sheet" role="dialog" aria-label="Choose an image">
        <div class="nc-sheet-head">
          <div class="nc-sheet-titlerow">
            <div>
              <div class="nc-sheet-title">Choose an image</div>
              <div class="nc-sheet-sub">Committed to your repo · /assets</div>
            </div>
            <div style="display:flex;gap:10px;align-items:center">
              <button type="button" class="nc-btn-ghost">
                <UploadIcon size={14} /> Upload
              </button>
              <button
                type="button"
                class="nc-iconbtn"
                aria-label="Close"
                onClick={onClose}
              >
                <CloseIcon />
              </button>
            </div>
          </div>
        </div>

        <div class="nc-sheet-body">
          <div class="nc-cat-header">All media · {items.length}</div>
          <div class="nc-media-grid">
            {items.map((item) => (
              <Tile
                key={item.url}
                item={item}
                selected={selected === item.url}
                onSelect={() => setSelected(item.url)}
              />
            ))}
            <div class="nc-media-upload">
              <UploadIcon size={18} />
              <span>Upload</span>
            </div>
          </div>
        </div>

        <div class="nc-sheet-foot">
          <button type="button" class="nc-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            class="nc-btn-primary"
            style="width:auto;padding:9px 18px"
            onClick={() => selected && onInsert(selected)}
          >
            Insert image
          </button>
        </div>
      </div>
    </div>
  );
}
