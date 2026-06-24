import type { Plugin } from "vite";
export type { ComponentMap } from "@nocms/renderer";
export { type BuildOptions, buildSite } from "./build-site";
export { type PrerenderedPage, type PrerenderOptions, prerenderRoutes, type Route, } from "./prerender";
/** MDX, image optimization, sitemap/RSS, and island-hydration plugins. */
export declare function nocmsVitePlugins(): Plugin[];
