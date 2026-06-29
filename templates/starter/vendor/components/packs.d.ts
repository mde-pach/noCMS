import { type ControlDescriptor } from "@nocms/controls";
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
export declare function block(component: unknown, extra?: Omit<BlockDef, "component">): BlockDef;
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
export declare function definePack(pack: ComponentPack): ComponentPack;
/** Merge packs into one registry, later packs overriding earlier by block name — so a site
 *  can replace a curated block with its own implementation. */
export declare function createRegistry(...packs: ComponentPack[]): ComponentRegistry;
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
/** The one place schema-vs-pre-derived is resolved: the pre-derived set when given, else
 *  derived from the schema, else none. */
export declare function controlsOf(def: BlockDef): ControlDescriptor[];
export declare function manifestOf(name: string, def: BlockDef): ComponentManifest;
/** The whole registry as a serializable catalog, in declaration order. */
export declare function registryManifest(registry: ComponentRegistry): ComponentManifest[];
