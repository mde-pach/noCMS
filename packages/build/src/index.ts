// The publish pipeline: Vite + Preact SSG, run asynchronously in Actions. It
// prerenders the same component tree the editor previews and hydrates islands —
// not a second renderer. Astro is deliberately avoided here: its component model
// would reintroduce the preview/publish drift this design eliminates.

import type { RepoRef } from "@nocms/core";
import type { Plugin } from "vite";

export interface BuildOptions {
  repo: RepoRef;
  /** site source root (the forked starter) */
  root: string;
  /** output dir deployed to Pages */
  outDir: string;
  /** base path, e.g. `/<repo>` for project Pages */
  base: string;
}

/** MDX, image optimization, sitemap/RSS, and prerender plugins. */
export function nocmsVitePlugins(): Plugin[] {
  return [];
}

export async function buildSite(_options: BuildOptions): Promise<void> {
  throw new Error("not implemented: Vite + Preact SSG build");
}
