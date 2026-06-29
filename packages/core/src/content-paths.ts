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

/** One element of a component's array prop — the unit the editor treats as a draggable, selectable
 *  "item" on the canvas (a pricing tier card, a feature in that tier's list, a nav link). */
export interface ItemPath {
  /** dotted path of the array element, e.g. `tiers.1` or `tiers.1.features.0` */
  path: string;
  /** the array's dotted key, e.g. `tiers` or `tiers.1.features` */
  key: string;
  /** the element's index within that array */
  index: number;
}

/**
 * Every array element in a component's props, at any depth — the cards/rows/list-items a repeated
 * prop renders to. Recurses through object-array items into their own arrays, so a tier's `features`
 * (`tiers.1.features.0`) is an item just like the tier (`tiers.1`). Both object and string arrays
 * qualify (a feature string is still a reorderable row). The index space mirrors the value's actual
 * length, so each item gets an unambiguous dotted path the canvas can pin to a DOM node and reorder.
 */
export function enumerateItemPaths(
  controls: ControlDescriptor[],
  value: unknown,
): ItemPath[] {
  if (!isRecord(value)) return [];
  const out: ItemPath[] = [];
  for (const control of controls) {
    collectItems(control, value[control.key], control.key, out);
  }
  return out;
}

function collectItems(
  control: ControlDescriptor,
  value: unknown,
  path: string,
  out: ItemPath[],
): void {
  if (control.kind === "group" && control.children && isRecord(value)) {
    for (const child of control.children) {
      collectItems(child, value[child.key], `${path}.${child.key}`, out);
    }
    return;
  }
  const element = control.children?.[0];
  if (control.kind === "list" && element && Array.isArray(value)) {
    value.forEach((item, index) => {
      out.push({ path: `${path}.${index}`, key: path, index });
      // Recurse into each element so arrays nested inside an object item are items too.
      collectItems(element, item, `${path}.${index}`, out);
    });
  }
}
