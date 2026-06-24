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
    /** Registry names that hydrate as islands; their roots get prerender markers. */
    islands?: string[];
    /**
     * URL of the island client bundle. A `<script type="module">` for it is injected
     * only into pages that actually contain an island, so island-free pages ship no JS.
     */
    islandClientSrc?: string;
}
export interface PrerenderedPage {
    path: string;
    html: string;
    /** island names present on this page — the per-page manifest read back from markers */
    islands: string[];
}
/**
 * Prerender each route to a complete static HTML document using the one renderer. Island
 * components are wrapped so their roots carry hydration markers + serialized props, and the
 * per-page island set is read back from the emitted markers; island-free pages stay
 * byte-for-byte identical to the static-only output (no markers, no script). The
 * file-emission and asset wiring is layered on top; this is the pure content→HTML core.
 */
export declare function prerenderRoutes(routes: Route[], options?: PrerenderOptions): Promise<PrerenderedPage[]>;
