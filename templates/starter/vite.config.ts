import mdx from "@mdx-js/rollup";
import preact from "@preact/preset-vite";
import remarkFrontmatter from "remark-frontmatter";
import { defineConfig } from "vite";

// MDX is compiled to a Preact component at build time, so the reader bundle
// never ships the MDX compiler. The remark plugin set must match the editor's
// runtime renderer (@nocms/renderer) so preview and published output agree —
// here that means stripping frontmatter the same way. Project Pages serve under
// /<repo>/, so base is set from an env var in CI and defaults to "/" locally.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [
    {
      enforce: "pre",
      ...mdx({ jsxImportSource: "preact", remarkPlugins: [remarkFrontmatter] }),
    },
    preact(),
  ],
});
