// The insert palette's data model: what the registry offers and the mdast node an
// insert splices in. Both are block-agnostic — every registry entry is insertable and
// the node factory branches only on whether a block declares slots (a container) or
// not (a leaf), never on a specific block name. A new brick appears in the palette and
// inserts correctly with zero changes here (the read-only, growing registry contract).

import type { BlockDef, ComponentRegistry } from "@nocms/components";
import type { Nodes } from "mdast";

export interface PaletteItem {
  name: string;
  /** declares child slots → a container the user can compose inside; else a leaf. */
  container: boolean;
}

/** Every block the registry offers, name-sorted so the menu order is deterministic. */
export function paletteItems(registry: ComponentRegistry): PaletteItem[] {
  return Object.keys(registry)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      name,
      container: (registry[name]?.slots?.length ?? 0) > 0,
    }));
}

/** Filter by a fuzzy-ish substring match on the block name. */
export function filterPalette(items: PaletteItem[], query: string): PaletteItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => item.name.toLowerCase().includes(q));
}

/**
 * A fresh mdast JSX block for `name`. A container (declares slots) seeds one editable
 * paragraph so the inserted block is immediately selectable and not an invisible empty
 * shell; a leaf serializes self-closing. Props are omitted — the component's own
 * defaults render, and the props panel fills them in (D9).
 */
export function createBlockNode(name: string, def: BlockDef | undefined): Nodes {
  const container = (def?.slots?.length ?? 0) > 0;
  return {
    type: "mdxJsxFlowElement",
    name,
    attributes: [],
    children: container
      ? [{ type: "paragraph", children: [{ type: "text", value: "Text" }] }]
      : [],
  } as Nodes;
}
