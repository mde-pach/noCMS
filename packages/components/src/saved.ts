// Saved components: the owner-authored, in-process twin of a sandboxed plugin component (D20).
// A saved component is a `BlockDef` built from *data* — pre-derived controls + a base to render —
// rather than a schema, so a non-developer authors it visually with no code and no build. It rides
// the same pack/manifest seam as the curated set, so the catalog, insert palette, props panel, and
// prerender treat it identically.
//
// Phase 1 covers *specialize*: take one existing block, bake some props (locked, hidden from the
// panel) and keep the rest editable (exposed, their saved value becoming the new default). The
// synthesized component is just the base partially applied.
//
// Phase 2 adds *compose*: a saved component whose implementation is a whole subtree of known
// components, with some inner props exposed and a child region left open as a slot. Its component
// builds a Preact tree from the stored structure using the same registry components — the
// data-driven twin of a hand-written composite (like the curated HeroSection). Same components,
// same Preact, so it renders identically in editor preview and publish prerender (invariant #1);
// it is not a second renderer, just one component whose tree comes from data instead of source.

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

/** A saved component declared by specializing one existing block. Fully serializable data — the
 *  currency a future runtime loader reads from the repo (Phase 1 inlines it as a literal). */
export interface SavedComponentDef {
  /** registry key for the new component, e.g. "PrimaryCTA". */
  name: string;
  /** the existing block this specializes, e.g. "Button". */
  base: string;
  /** props baked into every instance and hidden from the props panel. */
  locked: Record<string, PropPrimitive>;
  /** props that stay editable; each value is the seed default for the new control. */
  exposed: Record<string, PropPrimitive>;
  displayName?: string;
  description?: string;
  category?: string;
  /** interface version, bumped when the exposed set changes — drives instance migration later. */
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
  // Exposed controls keep the base's kind/label/config; only the default is reseeded to the
  // saved value — one source for the control shape, no drift (D9).
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

/** Compose a set of saved-component definitions into a pack, resolved against `base`. The pack
 *  merges last in `createRegistry(core, sitePack, savedPack(...))`, so saved components can shadow
 *  earlier blocks by name — the same override seam packs already use. */
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

/** The pure data behind "Save as component": split a configured instance's props into the ones to
 *  bake (everything not exposed) and the ones to keep editable. The editor binds this to a selected
 *  block's attributes; here it is a plain transform so it stays testable away from the DOM. */
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

/** One node of a composed component's stored implementation — a purpose-built, serializable tree
 *  of known components. A `slot` node is where the instance's own children render (the open child
 *  region); a `text` node is literal text. */
export type StructureNode =
  | {
      kind: "component";
      component: string;
      props: Record<string, PropSlot>;
      children: StructureNode[];
    }
  | { kind: "slot" }
  | { kind: "text"; text: string };

/** A composed saved component: a structure plus the controls it exposes (and whether it leaves a
 *  child region open). Its instances reference it by name and fill the exposed controls + slot. */
export interface ComposedComponentDef {
  name: string;
  structure: StructureNode;
  controls: ControlDescriptor[];
  /** true when the structure has a `slot` node — the component accepts children. */
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

/** Build a `BlockDef` from a composed definition: the component renders the stored structure with
 *  exposed controls and the instance's children substituted in, through the registry's components. */
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

/** Either kind of saved-component definition — the currency the editor stores and replays. */
export type SavedDef = SavedComponentDef | ComposedComponentDef;

/** Build a `BlockDef` from either kind of saved definition (composed has a `structure`). */
export function savedDefToBlock(def: SavedDef, registry: ComponentRegistry): BlockDef {
  return "structure" in def
    ? composedBlockFromDefinition(def, registry)
    : savedBlockFromDefinition(def, registry);
}
