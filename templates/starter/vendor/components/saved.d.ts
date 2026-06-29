import type { ControlDescriptor } from "@nocms/controls";
import { type BlockDef, type ComponentPack, type ComponentRegistry, type PropPrimitive } from "./packs";
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
/** Build a `BlockDef` from a saved-component definition against the registry it specializes.
 *  Throws on an unknown base so a broken definition fails loudly at load, not silently at render. */
export declare function savedBlockFromDefinition(def: SavedComponentDef, base: ComponentRegistry): BlockDef;
/** Compose saved-component definitions into a pack, resolved against `base`. Merge it last in
 *  `createRegistry(...)` so saved components can shadow earlier blocks by name. */
export declare function savedPack(defs: SavedComponentDef[], base: ComponentRegistry, id?: string): ComponentPack;
/** The data behind "Save as component": split an instance's props into the ones to bake
 *  (everything not exposed) and the ones to keep editable. A plain transform so it stays
 *  testable away from the DOM. */
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
/** One node of a composed component's stored implementation, a serializable tree of known
 *  components. A `slot` node is where the instance's own children render; a `text` node is
 *  literal text. */
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
/** Build a `BlockDef` from a composed definition: it renders the stored structure through the
 *  registry's components, substituting exposed controls and the instance's children. */
export declare function composedBlockFromDefinition(def: ComposedComponentDef, registry: ComponentRegistry): BlockDef;
export type SavedDef = SavedComponentDef | ComposedComponentDef;
/** Build a `BlockDef` from either kind of saved definition (composed has a `structure`). */
export declare function savedDefToBlock(def: SavedDef, registry: ComponentRegistry): BlockDef;
