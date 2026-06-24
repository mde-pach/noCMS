import { type ComponentType, type VNode } from "preact";
/** Components MDX tags resolve to (curated set + plugin packs). */
export type ComponentMap = Record<string, ComponentType<Record<string, unknown>>>;
export interface RenderInput {
    mdx: string;
    components: ComponentMap;
    /** values exposed to the document, available as props */
    data?: Record<string, unknown>;
}
/** Compile MDX to a Preact tree (the runtime preview path). */
export declare function renderToVNode(input: RenderInput): Promise<VNode>;
export declare function renderToStaticHtml(tree: VNode): string;
/** Compile MDX straight to static HTML (the publish path = preview path + render). */
export declare function renderToHtml(input: RenderInput): Promise<string>;
export { renderEditableToVNode } from "./editable.js";
export { collectIslands, deserializeIslandProps, hydrateIslands, type IdentifyIsland, ISLAND_ATTR, ISLAND_PROPS_ATTR, type IslandInstance, type IslandManifest, islandNamesFromHtml, serializeIslandProps, wrapIslandComponents, } from "./islands.js";
