// The insert menu both inserters open (slash and the "+" handles, §2 of the shell
// spec): a search field over the name-filtered block list. Keyboard-first — type to
// filter, Enter inserts the top match, Escape closes — so a page builds in one stream
// without the mouse. It is a pure presenter: picking a block reports its name; the
// shell turns that into the insert tree-transform.

import type { VNode } from "preact";
import { useState } from "preact/hooks";
import { filterPalette, type PaletteItem } from "./palette.js";

export interface PaletteMenuProps {
  items: PaletteItem[];
  onPick: (name: string) => void;
  onClose: () => void;
}

export function PaletteMenu({ items, onPick, onClose }: PaletteMenuProps): VNode {
  const [query, setQuery] = useState("");
  const filtered = filterPalette(items, query);
  return (
    <div class="nocms-palette" role="listbox">
      <input
        class="nocms-palette-search"
        type="text"
        // biome-ignore lint/a11y/noAutofocus: a summoned inserter must take the keyboard at once.
        autofocus
        placeholder="Insert block…"
        value={query}
        onInput={(e) => setQuery(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          } else if (e.key === "Enter") {
            e.preventDefault();
            const first = filtered[0];
            if (first) onPick(first.name);
          }
        }}
      />
      <ul class="nocms-palette-list">
        {filtered.map((item) => (
          <li key={item.name}>
            <button
              type="button"
              class="nocms-palette-item"
              onClick={() => onPick(item.name)}
            >
              {item.name}
              {item.container ? <span class="nocms-palette-tag">▸</span> : null}
            </button>
          </li>
        ))}
        {filtered.length === 0 ? <li class="nocms-palette-empty">No blocks</li> : null}
      </ul>
    </div>
  );
}
