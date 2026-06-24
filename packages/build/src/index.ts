// The publish pipeline: Vite + Preact SSG, run asynchronously in GitHub Actions.
// It prerenders the same component tree the editor previews and hydrates the
// interactive parts as islands — not a second renderer. prerenderRoutes is the
// pure content→HTML core; the surrounding Vite/asset/island wiring builds on it.

import type { RepoRef } from "@nocms/core";
import type { Plugin } from "vite";

export type { ComponentMap } from "@nocms/renderer";
export {
  type PrerenderedPage,
  type PrerenderOptions,
  prerenderRoutes,
  type Route,
} from "./prerender";

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
  throw new Error("not implemented: full Vite + Preact SSG build");
}
