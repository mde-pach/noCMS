import { type ComponentMap } from "@nocms/renderer";
export interface Route {
    /** output path, e.g. "/" or "/posts/first" */
    path: string;
    mdx: string;
    data?: Record<string, unknown>;
}
export interface PrerenderOptions {
    components?: ComponentMap;
    /** CSS injected into <head>, e.g. token custom properties */
    css?: string;
    /** Raw HTML appended to <head>, e.g. a favicon link respecting `base`. */
    head?: string;
    title?: (route: Route) => string;
}
export interface PrerenderedPage {
    path: string;
    html: string;
}
/**
 * Prerender each route to a complete static HTML document using the one renderer.
 * The file-emission, asset, and island-hydration wiring (the full Vite pipeline)
 * is layered on top of this; this is the pure content→HTML core.
 */
export declare function prerenderRoutes(routes: Route[], options?: PrerenderOptions): Promise<PrerenderedPage[]>;
