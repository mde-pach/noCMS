import type { ControlDescriptor } from "@nocms/core";
import { type BlockDef, type ComponentPack, type ComponentRegistry, type PropPrimitive } from "./packs";
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
/** Build a `BlockDef` from a saved-component definition against the registry it specializes.
 *  Throws on an unknown base so a broken definition fails loudly at load, not silently at render. */
export declare function savedBlockFromDefinition(def: SavedComponentDef, base: ComponentRegistry): BlockDef;
/** Compose a set of saved-component definitions into a pack, resolved against `base`. The pack
 *  merges last in `createRegistry(core, sitePack, savedPack(...))`, so saved components can shadow
 *  earlier blocks by name — the same override seam packs already use. */
export declare function savedPack(defs: SavedComponentDef[], base: ComponentRegistry, id?: string): ComponentPack;
/** The pure data behind "Save as component": split a configured instance's props into the ones to
 *  bake (everything not exposed) and the ones to keep editable. The editor binds this to a selected
 *  block's attributes; here it is a plain transform so it stays testable away from the DOM. */
export declare function defineSavedComponent(input: {
    name: string;
    base: string;
    props: Record<string, PropPrimitive>;
    expose: string[];
    displayName?: string;
    description?: string;
    category?: string;
}): SavedComponentDef;
/** A prop value in a composed structure: a baked-in primitive, or a reference to one of the
 *  component's exposed controls (filled per instance). */
export type PropSlot = {
    fixed: PropPrimitive;
} | {
    exposed: string;
};
/** One node of a composed component's stored implementation — a purpose-built, serializable tree
 *  of known components. A `slot` node is where the instance's own children render (the open child
 *  region); a `text` node is literal text. */
export type StructureNode = {
    kind: "component";
    component: string;
    props: Record<string, PropSlot>;
    children: StructureNode[];
} | {
    kind: "slot";
} | {
    kind: "text";
    text: string;
};
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
/** Build a `BlockDef` from a composed definition: the component renders the stored structure with
 *  exposed controls and the instance's children substituted in, through the registry's components. */
export declare function composedBlockFromDefinition(def: ComposedComponentDef, registry: ComponentRegistry): BlockDef;
/** Either kind of saved-component definition — the currency the editor stores and replays. */
export type SavedDef = SavedComponentDef | ComposedComponentDef;
/** Build a `BlockDef` from either kind of saved definition (composed has a `structure`). */
export declare function savedDefToBlock(def: SavedDef, registry: ComponentRegistry): BlockDef;
