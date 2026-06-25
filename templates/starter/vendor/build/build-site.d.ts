import { type SiteConfig } from "@nocms/core";
export interface BuildOptions {
    /** site source root (the forked starter) */
    root: string;
    /** output dir deployed to Pages */
    outDir: string;
    /**
     * Base path, e.g. `/<repo>/` for project Pages; `/` for a custom domain. Overrides
     * the config `base` (CI injects the repo name via this); defaults to it when omitted.
     */
    base?: string;
}
/** A route path → its output file. `/` → `index.html`, `/x` → `x/index.html`. */
export declare function routeToFilePath(routePath: string): string;
/** Non-empty and slash-terminated, so `${base}asset` always joins correctly. */
export declare function normalizeBase(base: string): string;
/**
 * Prerender a site to a static `outDir`: load content into routes, render each via
 * the one renderer (so preview and publish cannot diverge), inject runtime token CSS,
 * and copy `public/` assets. Curated components prerender to static HTML; island
 * hydration is a separate tier (D6) and is not wired here.
 */
export declare function buildSite(options: BuildOptions): Promise<void>;
export declare function runtimeConfigMarkup(config: SiteConfig, base: string): string;
