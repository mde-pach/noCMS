// An "item" selection: one element of a component's object-array prop (a pricing tier card, a
// feature, a nav link), addressed by its owning component block plus the array key and index. The
// canvas tags each item's card with `data-nocms-item="key.index"` (see content-anchors); this is
// the resolved, document-addressed form the selection and drag layers carry.

import type { IndexPath } from "./position.js";

export interface ItemSelection {
  /** the owning component's block path in the document */
  component: IndexPath;
  /** the array prop key, e.g. `tiers` */
  key: string;
  /** the element's index within the array */
  index: number;
  /** the dotted item path, e.g. `tiers.1` (what `data-nocms-item` carries) */
  path: string;
}

/** A droppable array for an item drag — the source's own array (in-place reorder) or any other
 *  same-shaped array in the document (a feature moving to another tier, or another Pricing). */
export interface ItemTarget {
  /** the array's owning component block */
  component: IndexPath;
  /** the array's dotted key, e.g. `tiers` or `tiers.1.features` */
  key: string;
}

/** Split a `data-nocms-item` value into its array key and index; undefined if it isn't `key.index`
 *  with a numeric tail. Kept narrow on purpose — v1 items are top-level arrays only. */
export function parseItemPath(raw: string): { key: string; index: number } | undefined {
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return undefined;
  const index = Number(raw.slice(dot + 1));
  if (!Number.isInteger(index) || index < 0) return undefined;
  return { key: raw.slice(0, dot), index };
}

/** Move the element at `from` to `to`, returning a new array (the source is left untouched). Out-of
 *  -range or no-op moves return a shallow copy unchanged. */
export function reorderArray<T>(items: readonly T[], from: number, to: number): T[] {
  const next = items.slice();
  if (from < 0 || from >= next.length || to < 0 || to >= next.length) return next;
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved as T);
  return next;
}
