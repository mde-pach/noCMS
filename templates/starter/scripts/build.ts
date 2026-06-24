// Prerenders the site to static HTML in `dist/` — what GitHub Pages serves. The same
// renderer powers the in-site editor's preview, so what you preview is what you publish.
// Project Pages serve under /<repo>/, so BASE_PATH is set in CI and defaults to "/".
import { buildSite } from "@nocms/build";

const root = new URL("..", import.meta.url).pathname;

await buildSite({
  root,
  outDir: new URL("../dist", import.meta.url).pathname,
  base: process.env.BASE_PATH ?? "/",
});

console.log("build: prerendered site → dist/");
