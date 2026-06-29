import { type ComponentRegistry } from "@nocms/components";
import type { ComponentChildren, ComponentType } from "preact";
export interface BuildOptions {
    root: string;
    outDir: string;
    /**
     * Overrides the config `base` (CI injects the repo name through this), defaulting to it when
     * omitted: `/<repo>/` for project Pages, `/` for a custom domain.
     */
    base?: string;
    /** A fork passes its own composed registry so its site-local components publish. */
    registry?: ComponentRegistry;
    /** Wraps every route in the same shell the editor and reader render, so the published page can't diverge from them. */
    shell?: ComponentType<{
        children?: ComponentChildren;
        base?: string;
    }>;
}
/** Renders every route through the one renderer so the published HTML cannot diverge from the editor preview. */
export declare function buildSite(options: BuildOptions): Promise<void>;
