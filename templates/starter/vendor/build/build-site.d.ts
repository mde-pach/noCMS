export interface BuildOptions {
    /** site source root (the forked starter) */
    root: string;
    /** output dir deployed to Pages */
    outDir: string;
    /** base path, e.g. `/<repo>/` for project Pages; `/` for a custom domain. */
    base: string;
}
/** A content file (relative POSIX path under `content/`) → its route path. */
export declare function contentPathToRoute(relPath: string): string;
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
