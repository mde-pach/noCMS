import { type ComponentType, type VNode } from "preact";
export type ComponentMap = Record<string, ComponentType<Record<string, unknown>>>;
export interface RenderInput {
    mdx: string;
    components: ComponentMap;
    data?: Record<string, unknown>;
}
export declare function renderToVNode(input: RenderInput): Promise<VNode>;
export declare function renderToStaticHtml(tree: VNode): string;
export declare function renderToHtml(input: RenderInput): Promise<string>;
export { type Anchor, type AnchorInput, probeContentAnchors, sentinelFor, } from "./content-anchors.js";
export { renderEditableToVNode } from "./editable.js";
export { collectIslands, deserializeIslandProps, hydrateIslands, type IdentifyIsland, ISLAND_ATTR, ISLAND_PROPS_ATTR, type IslandInstance, type IslandManifest, islandNamesFromHtml, serializeIslandProps, wrapIslandComponents, } from "./islands.js";
