import type { ControlDescriptor } from "@nocms/core";
import { type ComponentChild, h, type VNode } from "preact";
import {
  type AnyComponent,
  type BlockDef,
  type ComponentPack,
  type ComponentRegistry,
  controlsOf,
  definePack,
  type PropPrimitive,
} from "./packs";

/** A saved component declared by specializing one existing block. Fully serializable data. */
export interface SavedComponentDef {
  name: string;
  base: string;
  /** Props baked into every instance and hidden from the props panel. */
  locked: Record<string, PropPrimitive>;
  /** Props that stay editable; each value becomes the new control's default. */
  exposed: Record<string, PropPrimitive>;
  displayName?: string;
  description?: string;
  category?: string;
  /** Bumped when the exposed set changes — drives instance migration later. */
  version?: number;
}

function pickExposed(
  props: Record<string, unknown>,
  seeds: Record<string, PropPrimitive>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(seeds)) {
    out[key] = key in props ? props[key] : seeds[key];
  }
  return out;
}

/** Build a `BlockDef` from a saved-component definition against the registry it specializes.
 *  Throws on an unknown base so a broken definition fails loudly at load, not silently at render. */
export function savedBlockFromDefinition(
  def: SavedComponentDef,
  base: ComponentRegistry,
): BlockDef {
  const baseDef = base[def.base];
  if (!baseDef) {
    throw new Error(`savedBlockFromDefinition: unknown base block "${def.base}"`);
  }

  const exposed = def.exposed;
  // Reuse the base control's kind/label/config; only the default is reseeded to the saved value.
  const controls: ControlDescriptor[] = controlsOf(baseDef)
    .filter((control) => control.key in exposed)
    .map((control) => ({ ...control, default: exposed[control.key] }));

  const Base = baseDef.component;
  const component: AnyComponent = (props) =>
    h(Base, { ...def.locked, ...pickExposed(props, exposed) });

  return {
    component,
    controls,
    island: baseDef.island,
    displayName: def.displayName ?? def.name,
    description: def.description,
    category: def.category ?? baseDef.category,
  };
}

/** Compose saved-component definitions into a pack, resolved against `base`. Merge it last in
 *  `createRegistry(...)` so saved components can shadow earlier blocks by name. */
export function savedPack(
  defs: SavedComponentDef[],
  base: ComponentRegistry,
  id = "site-saved",
): ComponentPack {
  const blocks: ComponentRegistry = {};
  for (const def of defs) {
    blocks[def.name] = savedBlockFromDefinition(def, base);
  }
  return definePack({ id, name: "Saved components", trust: "builtin", blocks });
}

/** The data behind "Save as component": split an instance's props into the ones to bake
 *  (everything not exposed) and the ones to keep editable. A plain transform so it stays
 *  testable away from the DOM. */
export function defineSavedComponent(input: {
  name: string;
  base: string;
  props: Record<string, PropPrimitive>;
  expose: string[];
  displayName?: string;
  description?: string;
  category?: string;
}): SavedComponentDef {
  const locked: Record<string, PropPrimitive> = {};
  const exposed: Record<string, PropPrimitive> = {};
  for (const [key, value] of Object.entries(input.props)) {
    if (input.expose.includes(key)) exposed[key] = value;
    else locked[key] = value;
  }
  return {
    name: input.name,
    base: input.base,
    locked,
    exposed,
    displayName: input.displayName,
    description: input.description,
    category: input.category,
    version: 1,
  };
}

/** A prop value in a composed structure: a baked-in primitive, or a reference to one of the
 *  component's exposed controls (filled per instance). */
export type PropSlot = { fixed: PropPrimitive } | { exposed: string };

/** One node of a composed component's stored implementation, a serializable tree of known
 *  components. A `slot` node is where the instance's own children render; a `text` node is
 *  literal text. */
export type StructureNode =
  | {
      kind: "component";
      component: string;
      props: Record<string, PropSlot>;
      children: StructureNode[];
    }
  | { kind: "slot" }
  | { kind: "text"; text: string };

/** A composed saved component: a structure plus the controls it exposes. Its instances reference
 *  it by name and fill the exposed controls and slot. */
export interface ComposedComponentDef {
  name: string;
  structure: StructureNode;
  controls: ControlDescriptor[];
  /** True when the structure has a `slot` node — the component accepts children. */
  slot?: boolean;
  displayName?: string;
  description?: string;
  category?: string;
  version?: number;
}

function resolveProps(
  props: Record<string, PropSlot>,
  exposed: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, slot] of Object.entries(props)) {
    out[key] = "fixed" in slot ? slot.fixed : exposed[slot.exposed];
  }
  return out;
}

function buildStructure(
  node: StructureNode,
  exposed: Record<string, unknown>,
  slotChildren: ComponentChild,
  registry: ComponentRegistry,
): ComponentChild {
  if (node.kind === "text") return node.text;
  if (node.kind === "slot") return slotChildren;
  const target = registry[node.component]?.component ?? node.component;
  const props = resolveProps(node.props, exposed);
  const children = node.children.map((child) =>
    buildStructure(child, exposed, slotChildren, registry),
  );
  return h(target as AnyComponent, props, ...children);
}

/** Build a `BlockDef` from a composed definition: it renders the stored structure through the
 *  registry's components, substituting exposed controls and the instance's children. */
export function composedBlockFromDefinition(
  def: ComposedComponentDef,
  registry: ComponentRegistry,
): BlockDef {
  const component: AnyComponent = (props) =>
    buildStructure(
      def.structure,
      props,
      (props as { children?: ComponentChild }).children,
      registry,
    ) as VNode;
  return {
    component,
    controls: def.controls,
    slots: def.slot ? ["children"] : undefined,
    displayName: def.displayName ?? def.name,
    description: def.description,
    category: def.category,
  };
}

export type SavedDef = SavedComponentDef | ComposedComponentDef;

/** Build a `BlockDef` from either kind of saved definition (composed has a `structure`). */
export function savedDefToBlock(def: SavedDef, registry: ComponentRegistry): BlockDef {
  return "structure" in def
    ? composedBlockFromDefinition(def, registry)
    : savedBlockFromDefinition(def, registry);
}
