// The publish pipeline. It prerenders the same component tree the editor previews to
// static HTML with the one renderer (never a second renderer), so preview and published
// output cannot diverge. `buildSite` is the prerender-and-emit entry a forked site runs
// in GitHub Actions; `prerenderRoutes` is its pure content→HTML core. Island hydration
// and the Vite-tier plugins (`nocmsVitePlugins`) are the eventual interactivity story (D6).

export type { ComponentMap } from "@nocms/renderer";
export { type BuildOptions, buildSite } from "./build-site";
export {
  type PrerenderedPage,
  type PrerenderOptions,
  prerenderRoutes,
  type Route,
} from "./prerender";
export {
  ISLAND_VIRTUAL_ID,
  islandClientEntry,
  nocmsVitePlugins,
} from "./vite-plugins";
