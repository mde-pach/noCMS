// The composition seam for the component library. The curated set is just the first
// pack; a site composes more with `createRegistry(core, myPack)` — no edit to this
// package required (D18). A pack is the unit of distribution.
//
// `ComponentManifest` is the serializable description of one insertable component and
// is the currency that crosses the editor↔sandbox boundary (invariant #8): a valibot
// schema and a Preact component do not survive `postMessage`, but a `ControlDescriptor[]`
// plus plain metadata do. The insert palette renders from manifests alone, so a builtin
// and a sandboxed component are indistinguishable to it — designed for sandbox from day one.

import { type ControlDescriptor, deriveControls } from "@nocms/core";
import type { ComponentType } from "preact";
import type { GenericSchema } from "valibot";

export type AnyComponent = ComponentType<Record<string, unknown>>;

/** A serializable starter prop value. Mirrors what the props panel can edit. */
export type PropPrimitive = string | number | boolean;

/** A block in the editor's uniform tree (D15): a component plus, optionally, the valibot
 *  props schema its controls derive from (D9), the named child slots it accepts (absent =
 *  leaf), and editor-facing catalog metadata that drives the insert palette. */
export interface BlockDef {
  component: AnyComponent;
  /** valibot props schema → editor controls via `deriveControls`. */
  schema?: GenericSchema;
  /** pre-derived controls, for a block with no valibot schema (a sandboxed plugin
   *  component ships serialized controls, not a schema). Wins over `schema`. */
  controls?: ControlDescriptor[];
  /** named child regions this container accepts; absent = leaf. */
  slots?: string[];
  /** needs client-side hydration as an island? */
  island?: boolean;
  /** catalog label; defaults to the registry key. */
  displayName?: string;
  /** one-line description shown in the insert palette. */
  description?: string;
  /** palette grouping, e.g. "Layout", "Content", "Media". */
  category?: string;
  /** a glyph/icon name the host palette maps to a visual. */
  icon?: string;
  /** free-text tags for palette search. */
  tags?: string[];
  /** an optional pre-rendered HTML snapshot for the catalog card — a real preview of a saved
   *  component, where the curated set uses a hand-drawn mock. Plain HTML, so it stays serializable. */
  preview?: string;
}

export type ComponentRegistry = Record<string, BlockDef>;

/** Declare a block from a component + metadata. The cast is the one place a typed Preact
 *  component meets the registry's structural `AnyComponent`; site authors use it so they
 *  never fight prop-type variance. */
export function block(
  component: unknown,
  extra: Omit<BlockDef, "component"> = {},
): BlockDef {
  return { component: component as AnyComponent, ...extra };
}

/** A distributable bundle of components. The curated library is the `core` pack; plugin
 *  packs add more. `trust` records how the pack's code runs: `builtin` is trusted
 *  in-process code; `sandboxed` runs behind the capability boundary (invariant #8). */
export interface ComponentPack {
  /** stable namespace id, e.g. "core" or "acme-marketing". */
  id: string;
  /** human label for the pack. */
  name?: string;
  version?: string;
  trust?: "builtin" | "sandboxed";
  blocks: ComponentRegistry;
}

/** Identity with validation — a named seam so a pack is declared, not just an object
 *  literal, and so future checks (id format, name collisions) have one home. */
export function definePack(pack: ComponentPack): ComponentPack {
  if (!pack.id) throw new Error("definePack: a pack needs a non-empty id");
  return pack;
}

/** Merge packs into one registry, later packs overriding earlier ones by block name —
 *  the override seam (a site can replace a curated block with its own implementation). */
export function createRegistry(...packs: ComponentPack[]): ComponentRegistry {
  const merged: ComponentRegistry = {};
  for (const pack of packs) {
    for (const [name, def] of Object.entries(pack.blocks)) merged[name] = def;
  }
  return merged;
}

/** The serializable description of one insertable component. Crosses the sandbox boundary;
 *  the insert palette consumes only this, never a live `BlockDef`. */
export interface ComponentManifest {
  name: string;
  displayName: string;
  description?: string;
  category: string;
  icon?: string;
  tags?: string[];
  slots?: string[];
  island: boolean;
  /** controls derived from the block's schema; `[]` for a schema-less block. */
  controls: ControlDescriptor[];
  /** starter props an insert should stamp onto the new block. */
  defaults: Record<string, PropPrimitive>;
  /** optional rendered-HTML preview for the catalog card; absent for curated blocks. */
  preview?: string;
}

const DEFAULT_CATEGORY = "Other";

function isPrimitive(value: unknown): value is PropPrimitive {
  return (
    typeof value === "string" || typeof value === "number" || typeof value === "boolean"
  );
}

/** The value an insert should stamp for a control: its schema default when present, else
 *  a friendly placeholder for required fields so a freshly inserted block is never blank
 *  (a required text field shows its label; a select takes its first option). */
function starterValue(control: ControlDescriptor): PropPrimitive | undefined {
  if (isPrimitive(control.default)) return control.default;
  if (!control.required) return undefined;
  switch (control.kind) {
    case "boolean":
      return false;
    case "number":
    case "range":
      return typeof control.config?.min === "number" ? control.config.min : 0;
    case "select": {
      const options = control.config?.options;
      return Array.isArray(options) && isPrimitive(options[0]) ? options[0] : undefined;
    }
    default:
      return control.label;
  }
}

/** The block's controls: its pre-derived set when given, else derived from its schema,
 *  else none. The one place schema-vs-pre-derived is resolved. */
export function controlsOf(def: BlockDef): ControlDescriptor[] {
  if (def.controls) return def.controls;
  return def.schema ? deriveControls(def.schema) : [];
}

/** Derive a block's serializable manifest. */
export function manifestOf(name: string, def: BlockDef): ComponentManifest {
  const controls = controlsOf(def);
  const defaults: Record<string, PropPrimitive> = {};
  for (const control of controls) {
    const value = starterValue(control);
    if (value !== undefined) defaults[control.key] = value;
  }
  return {
    name,
    displayName: def.displayName ?? name,
    description: def.description,
    category: def.category ?? DEFAULT_CATEGORY,
    icon: def.icon,
    tags: def.tags,
    slots: def.slots,
    island: def.island ?? false,
    controls,
    defaults,
    preview: def.preview,
  };
}

/** The whole registry as a serializable catalog, in declaration order. */
export function registryManifest(registry: ComponentRegistry): ComponentManifest[] {
  return Object.entries(registry).map(([name, def]) => manifestOf(name, def));
}
