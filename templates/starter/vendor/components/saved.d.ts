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
