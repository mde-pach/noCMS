import type { GenericSchema } from "valibot";
import {
  arrayItem,
  baseType,
  controlMetadata,
  defaultOf,
  numericBounds,
  objectEntries,
  picklistOptions,
  unwrap,
} from "./valibot-introspect";

export type ControlKind =
  | "text"
  | "textarea"
  | "number"
  | "range"
  | "boolean"
  | "select"
  | "color"
  | "image"
  | "url"
  | "richtext"
  | "reference"
  | "date"
  | "group"
  | "list"
  // Open set: a host maps a `v.metadata({ control })` hint to any kind beyond the built-ins above
  // and renders it itself — the editor's layout widgets and plugin controls ride this. The string
  // literals exist only for autocomplete; an unknown kind is valid and the host owns its rendering.
  | (string & {});

/** A control hides until another field holds a given value. */
export interface ShowIf {
  key: string;
  equals: unknown;
}

export interface ControlDescriptor {
  /** the prop / field name */
  key: string;
  kind: ControlKind;
  label: string;
  required: boolean;
  default?: unknown;
  /** folds under a "More" disclosure */
  advanced?: boolean;
  showIf?: ShowIf;
  /** kind-specific: `{ options }` for select, `{ min, max }` for range */
  config?: Record<string, unknown>;
  /** nested object → its child controls; array → the element's control */
  children?: ControlDescriptor[];
}

/** The kinds @nocms/controls derives natively. A host may render additional open-set kinds (mapped
 *  from a `v.metadata({ control })` hint) that are deliberately not listed here. */
export const KNOWN_CONTROL_KINDS: ReadonlySet<string> = new Set([
  "text",
  "textarea",
  "number",
  "range",
  "boolean",
  "select",
  "color",
  "image",
  "url",
  "richtext",
  "reference",
  "date",
  "group",
  "list",
]);

function humanize(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function baseControl(
  type: string,
  schema: GenericSchema,
): { kind: ControlKind; config?: Record<string, unknown> } {
  switch (type) {
    case "string":
      return { kind: "text" };
    case "number": {
      const bounds = numericBounds(schema);
      return bounds.min !== undefined || bounds.max !== undefined
        ? { kind: "range", config: bounds }
        : { kind: "number" };
    }
    case "boolean":
      return { kind: "boolean" };
    case "picklist":
      return { kind: "select", config: { options: picklistOptions(schema) ?? [] } };
    case "object":
      return { kind: "group" };
    case "array":
      return { kind: "list" };
    default:
      // Unknown base type → a text box never blocks editing.
      return { kind: "text" };
  }
}

function isShowIf(value: unknown): value is ShowIf {
  return (
    !!value &&
    typeof value === "object" &&
    "key" in value &&
    "equals" in (value as Record<string, unknown>)
  );
}

function deriveControl(key: string, entry: GenericSchema): ControlDescriptor {
  const { schema, required } = unwrap(entry);
  const meta = controlMetadata(schema);
  const type = baseType(schema);
  const base = baseControl(type, schema);

  // A meta-type hint wins over the base type (media→image, date→date, …).
  const hinted = typeof meta.control === "string" ? meta.control : undefined;
  const kind: ControlKind = hinted ?? base.kind;

  const descriptor: ControlDescriptor = {
    key,
    kind,
    label: typeof meta.label === "string" ? meta.label : humanize(key),
    required,
  };

  const def = defaultOf(entry);
  if (def !== undefined) descriptor.default = def;
  if (meta.advanced === true) descriptor.advanced = true;
  if (isShowIf(meta.showIf)) descriptor.showIf = meta.showIf;
  if (base.config) descriptor.config = base.config;

  // A schema can hand kind-specific config straight to its control (e.g. the
  // `layout-align` matrix needs the sibling `justify` prop it co-writes). It merges
  // over the base config so a hint can refine a derived `{ options }`, never lose it.
  if (meta.config && typeof meta.config === "object") {
    descriptor.config = {
      ...descriptor.config,
      ...(meta.config as Record<string, unknown>),
    };
  }

  // Recurse into nested structure only when no explicit hint overrides it.
  if (!hinted && type === "object") {
    descriptor.children = deriveControls(schema);
  }
  if (!hinted && type === "array") {
    const item = arrayItem(schema);
    if (item) descriptor.children = [deriveControl("item", item)];
  }

  return descriptor;
}

/** Derive the editor controls for an object schema's fields, in declaration order. */
export function deriveControls(schema: GenericSchema): ControlDescriptor[] {
  const entries = objectEntries(schema);
  if (!entries) return [];
  return Object.entries(entries).map(([key, entry]) => deriveControl(key, entry));
}
