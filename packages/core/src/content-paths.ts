import type { GenericSchema } from "valibot";
import { type ControlDescriptor, deriveControls } from "./controls";

// Control kinds whose value is free display text — the leaves worth anchoring back to a
// rendered DOM node. Logic props (select/boolean/number) and non-text content (image/url)
// are deliberately excluded: a component may branch on them, and they don't render as
// locatable prose. Anchoring only display text is what makes the substitution safe.
const TEXT_KINDS: ReadonlySet<string> = new Set(["text", "textarea", "richtext"]);

export interface ContentPath {
  /** dotted path into the props value, e.g. `items.2.title` */
  path: string;
  /** the leaf's current string value */
  value: string;
}

/**
 * Walk a component's resolved props against its schema-derived controls, emitting one entry
 * per display-text leaf with its dotted path. Array elements expand by the value's actual
 * length — the schema carries a single element control, the value carries N items — so a
 * repeated field like `items.2.title` gets its own unambiguous path, which is the whole
 * point: provenance keyed by structure, never by content.
 */
export function enumerateContentPaths(
  schema: GenericSchema,
  value: unknown,
): ContentPath[] {
  return contentPathsFromControls(deriveControls(schema), value);
}

/**
 * Same enumeration keyed on already-derived controls rather than a schema — the path the
 * editor takes, where a selected block carries `ControlDescriptor[]` (a plugin block has
 * pre-derived controls and no schema to re-derive from).
 */
export function contentPathsFromControls(
  controls: ControlDescriptor[],
  value: unknown,
): ContentPath[] {
  return walkControls(controls, value, "");
}

function walkControls(
  controls: ControlDescriptor[],
  value: unknown,
  prefix: string,
): ContentPath[] {
  if (!isRecord(value)) return [];
  const out: ContentPath[] = [];
  for (const control of controls) {
    const path = prefix ? `${prefix}.${control.key}` : control.key;
    out.push(...emit(control, value[control.key], path));
  }
  return out;
}

function emit(control: ControlDescriptor, value: unknown, path: string): ContentPath[] {
  if (TEXT_KINDS.has(control.kind)) {
    return typeof value === "string" ? [{ path, value }] : [];
  }
  if (control.kind === "group" && control.children) {
    return walkControls(control.children, value, path);
  }
  if (control.kind === "list" && control.children?.[0] && Array.isArray(value)) {
    const element = control.children[0];
    return value.flatMap((item, i) => emit(element, item, `${path}.${i}`));
  }
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** One element of a component's object-array prop — the unit the editor treats as a draggable,
 *  selectable "item" on the canvas (e.g. a pricing tier card). */
export interface ItemPath {
  /** dotted path of the array element, e.g. `tiers.1` */
  path: string;
  /** the array prop's key, e.g. `tiers` */
  key: string;
  /** the element's index within the array */
  index: number;
}

/**
 * The object-array elements of a component's props — the cards/rows a repeated prop renders to.
 * Only top-level arrays whose element is an object (a `group` control) qualify: those render as
 * rich, locatable items, whereas a string array is just a list of leaves. The index space mirrors
 * the value's actual length, so each item gets an unambiguous `key.index` path the canvas can pin
 * to a DOM node (via its leaves) and reorder.
 */
export function enumerateItemPaths(
  controls: ControlDescriptor[],
  value: unknown,
): ItemPath[] {
  if (!isRecord(value)) return [];
  const out: ItemPath[] = [];
  for (const control of controls) {
    if (control.kind !== "list" || control.children?.[0]?.kind !== "group") continue;
    const items = value[control.key];
    if (!Array.isArray(items)) continue;
    items.forEach((_, index) => {
      out.push({ path: `${control.key}.${index}`, key: control.key, index });
    });
  }
  return out;
}
