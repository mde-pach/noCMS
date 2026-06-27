import { type ComponentMap } from "@nocms/renderer";
import { type ComponentChildren, type ComponentType } from "preact";
export interface Route {
    /** output path, e.g. "/" or "/posts/first" */
    path: string;
    mdx: string;
    data?: Record<string, unknown>;
}
export interface PrerenderOptions {
    components?: ComponentMap;
    /**
     * Optional site shell wrapping every route's content (header/footer/page frame). Rendered by
     * the one renderer, so the published page carries the same shell the editor and reader show —
     * what you edit is what publishes, shell included (D21). The route's content becomes its
     * children; `base` is passed through for nav links.
     */
    shell?: ComponentType<{
        children?: ComponentChildren;
        base?: string;
    }>;
    /** Base path passed to the shell. */
    base?: string;
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
    /**
     * Ships the in-site editor with the static page so `?edit` opens it in the browser. Each
     * page inlines its own MDX source + tokens + schemas as inert JSON, and a tiny bootstrap
     * lazy-loads the (heavy) editor bundle only when `?edit` is present — readers never download
     * it. Editing is in-memory here (no persistence); saving to GitHub is a separate seam.
     */
    editor?: {
        /** URL of the editor client bundle, imported on demand. */
        clientSrc: string;
        /** flat token source the design panel themes from. */
        tokens?: string;
        /** per-component controls, injected (not discovered live in the browser). */
        schemas?: Record<string, unknown>;
    };
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
