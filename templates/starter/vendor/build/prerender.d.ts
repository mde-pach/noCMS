import { type ComponentMap } from "@nocms/renderer";
import { type ComponentChildren, type ComponentType } from "preact";
export interface Route {
    path: string;
    mdx: string;
    data?: Record<string, unknown>;
}
export interface PrerenderOptions {
    components?: ComponentMap;
    /** Wraps every route through the one renderer so the published page carries the same shell the editor and reader show; the route's content becomes its children. */
    shell?: ComponentType<{
        children?: ComponentChildren;
        base?: string;
    }>;
    base?: string;
    css?: string;
    /**
     * When set, a static Tailwind stylesheet is compiled from the classes used across all prerendered
     * pages and appended after `css`. `base` is the filesystem dir that resolves `tailwindcss`.
     */
    tailwind?: {
        theme: string;
        base: string;
    };
    head?: string;
    title?: (route: Route) => string;
    /** Registry names to treat as islands; their roots get prerender markers. */
    islands?: string[];
    /** URL of the island client bundle; its `<script>` is injected only into pages with an island, so island-free pages ship no JS. */
    islandClientSrc?: string;
    /**
     * Inlines the page's MDX + tokens + schemas as inert JSON and a bootstrap that lazy-loads the
     * heavy editor bundle only on `?edit`, so readers never download it.
     */
    editor?: {
        clientSrc: string;
        tokens?: string;
        schemas?: Record<string, unknown>;
    };
}
export interface PrerenderedPage {
    path: string;
    html: string;
    islands: string[];
}
/**
 * Renders each route to a full HTML document through the one renderer. Island roots are wrapped
 * with hydration markers + serialized props; island-free pages stay byte-for-byte identical to
 * the static-only output (no markers, no script).
 */
export declare function prerenderRoutes(routes: Route[], options?: PrerenderOptions): Promise<PrerenderedPage[]>;
