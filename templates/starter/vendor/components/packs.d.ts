import { type ControlDescriptor } from "@nocms/core";
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
}
export type ComponentRegistry = Record<string, BlockDef>;
/** Declare a block from a component + metadata. The cast is the one place a typed Preact
 *  component meets the registry's structural `AnyComponent`; site authors use it so they
 *  never fight prop-type variance. */
export declare function block(component: unknown, extra?: Omit<BlockDef, "component">): BlockDef;
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
export declare function definePack(pack: ComponentPack): ComponentPack;
/** Merge packs into one registry, later packs overriding earlier ones by block name —
 *  the override seam (a site can replace a curated block with its own implementation). */
export declare function createRegistry(...packs: ComponentPack[]): ComponentRegistry;
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
}
/** The block's controls: its pre-derived set when given, else derived from its schema,
 *  else none. The one place schema-vs-pre-derived is resolved. */
export declare function controlsOf(def: BlockDef): ControlDescriptor[];
/** Derive a block's serializable manifest. */
export declare function manifestOf(name: string, def: BlockDef): ComponentManifest;
/** The whole registry as a serializable catalog, in declaration order. */
export declare function registryManifest(registry: ComponentRegistry): ComponentManifest[];
