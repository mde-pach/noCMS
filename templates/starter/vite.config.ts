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
  // The vendored @nocms/* bundles (D1) are already built. Letting Vite re-optimize
  // them runs esbuild DCE in isolation, which strips properties only read
  // cross-package — e.g. each registry block's `schema`/`slots`, consumed by
  // @nocms/editor — leaving the editor's props panel empty. Serve them as-is.
  optimizeDeps: {
    exclude: ["@nocms/components", "@nocms/renderer", "@nocms/tokens", "@nocms/build"],
  },
  plugins: [
    {
      enforce: "pre",
      ...mdx({ jsxImportSource: "preact", remarkPlugins: [remarkFrontmatter] }),
    },
    preact(),
  ],
});
