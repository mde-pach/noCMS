import { type VNode } from "preact";
import type { ComponentMap } from "./index.js";
export declare const ISLAND_ATTR = "data-island";
export declare const ISLAND_PROPS_ATTR = "data-island-props";
export interface IslandInstance {
    /** the registered tag the marker is hydrated back into */
    name: string;
    /** the serializable props needed to re-instantiate the component client-side */
    props: Record<string, unknown>;
}
export interface IslandManifest {
    /** unique island names present — the set of components the client must ship */
    islands: string[];
    /** every island occurrence, with the props to re-instantiate it */
    instances: IslandInstance[];
}
/** Resolves a VNode's component type to its island name, or undefined for non-islands. */
export type IdentifyIsland = (type: unknown, props: Record<string, unknown>) => string | undefined;
export declare function serializeIslandProps(props: Record<string, unknown>): string;
export declare function deserializeIslandProps(raw: string | null): Record<string, unknown>;
/**
 * Walk a resolved VNode tree and collect every island sub-tree it contains. Pure — no DOM,
 * no render. The prerender path can't use this directly (an MDX document renders lazily, so
 * there is no resolved tree to walk before output), but a consumer that already holds a tree
 * — the editor preview — gets the islands on a page from it.
 */
export declare function collectIslands(tree: VNode, identify: IdentifyIsland): IslandManifest;
/**
 * Replace each named island component with a marker-emitting host, leaving every other
 * component untouched. The build passes the result to the renderer so island roots prerender
 * with their marker + serialized props while island-free output stays byte-for-byte the same.
 */
export declare function wrapIslandComponents(components: ComponentMap, islandNames: Iterable<string>): ComponentMap;
/** Unique island names present in prerendered HTML — the post-render manifest seam. */
export declare function islandNamesFromHtml(html: string): string[];
/**
 * Find every island marker under `root`, deserialize its props, and hydrate the matching
 * component from `components` in place — reusing the one renderer's component model. The only
 * DOM-touching island seam.
 */
export declare function hydrateIslands(components: ComponentMap, root?: ParentNode): void;
