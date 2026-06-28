import { type ControlDescriptor, deriveControls } from "@nocms/core";
import type { ComponentType } from "preact";
import type { GenericSchema } from "valibot";

export type AnyComponent = ComponentType<Record<string, unknown>>;

export type PropPrimitive = string | number | boolean;

export interface BlockDef {
  component: AnyComponent;
  schema?: GenericSchema;
  /** Pre-derived controls for a block with no schema (a sandboxed plugin ships serialized
   *  controls, not a schema). Wins over `schema`. */
  controls?: ControlDescriptor[];
  /** Named child regions this container accepts; absent = leaf. */
  slots?: string[];
  island?: boolean;
  displayName?: string;
  description?: string;
  category?: string;
  icon?: string;
  tags?: string[];
  /** A pre-rendered HTML snapshot for the catalog card. Plain HTML, so it stays serializable. */
  preview?: string;
}

export type ComponentRegistry = Record<string, BlockDef>;

/** Declare a block from a component + metadata. The cast is the one place a typed Preact
 *  component meets the registry's structural `AnyComponent`, so site authors never fight
 *  prop-type variance. */
export function block(
  component: unknown,
  extra: Omit<BlockDef, "component"> = {},
): BlockDef {
  return { component: component as AnyComponent, ...extra };
}

/** A distributable bundle of components. `trust` records how the pack's code runs:
 *  `builtin` is trusted in-process; `sandboxed` runs behind the capability boundary. */
export interface ComponentPack {
  id: string;
  name?: string;
  version?: string;
  trust?: "builtin" | "sandboxed";
  blocks: ComponentRegistry;
}

/** A named seam so a pack is declared, not just an object literal, giving future checks
 *  (id format, name collisions) one home. */
export function definePack(pack: ComponentPack): ComponentPack {
  if (!pack.id) throw new Error("definePack: a pack needs a non-empty id");
  return pack;
}

/** Merge packs into one registry, later packs overriding earlier by block name — so a site
 *  can replace a curated block with its own implementation. */
export function createRegistry(...packs: ComponentPack[]): ComponentRegistry {
  const merged: ComponentRegistry = {};
  for (const pack of packs) {
    for (const [name, def] of Object.entries(pack.blocks)) merged[name] = def;
  }
  return merged;
}

/** The serializable description of one insertable component. The insert palette consumes
 *  only this, never a live `BlockDef`. */
export interface ComponentManifest {
  name: string;
  displayName: string;
  description?: string;
  category: string;
  icon?: string;
  tags?: string[];
  slots?: string[];
  island: boolean;
  controls: ControlDescriptor[];
  defaults: Record<string, PropPrimitive>;
  preview?: string;
}

const DEFAULT_CATEGORY = "Other";

function isPrimitive(value: unknown): value is PropPrimitive {
  return (
    typeof value === "string" || typeof value === "number" || typeof value === "boolean"
  );
}

/** A starter value for a control: its schema default when present, else a placeholder for
 *  required fields so a freshly inserted block is never blank (a required text field shows
 *  its label; a select takes its first option). */
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

/** The one place schema-vs-pre-derived is resolved: the pre-derived set when given, else
 *  derived from the schema, else none. */
export function controlsOf(def: BlockDef): ControlDescriptor[] {
  if (def.controls) return def.controls;
  return def.schema ? deriveControls(def.schema) : [];
}

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
