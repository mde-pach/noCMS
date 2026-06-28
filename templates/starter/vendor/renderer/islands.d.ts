import { type VNode } from "preact";
import type { ComponentMap } from "./index.js";
export declare const ISLAND_ATTR = "data-island";
export declare const ISLAND_PROPS_ATTR = "data-island-props";
export interface IslandInstance {
    name: string;
    props: Record<string, unknown>;
}
export interface IslandManifest {
    islands: string[];
    instances: IslandInstance[];
}
/** Resolves a VNode's component type to its island name, or undefined for non-islands. */
export type IdentifyIsland = (type: unknown, props: Record<string, unknown>) => string | undefined;
export declare function serializeIslandProps(props: Record<string, unknown>): string;
export declare function deserializeIslandProps(raw: string | null): Record<string, unknown>;
/**
 * Collects every island sub-tree in a resolved VNode tree. The prerender path can't use it (an
 * MDX document renders lazily, so there's no resolved tree to walk before output); a consumer
 * that already holds a tree — the editor preview — can.
 */
export declare function collectIslands(tree: VNode, identify: IdentifyIsland): IslandManifest;
/**
 * Replaces each named island with a marker-emitting host, leaving other components untouched, so
 * island roots prerender with their marker while island-free output stays byte-for-byte the same.
 */
export declare function wrapIslandComponents(components: ComponentMap, islandNames: Iterable<string>): ComponentMap;
export declare function islandNamesFromHtml(html: string): string[];
/** Hydrates each island marker under `root` in place — the only DOM-touching island seam. */
export declare function hydrateIslands(components: ComponentMap, root?: ParentNode): void;
