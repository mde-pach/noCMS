import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mdx from "@mdx-js/rollup";
import preact from "@preact/preset-vite";
import remarkFrontmatter from "remark-frontmatter";
import { defineConfig } from "vite";

// MDX is compiled to a Preact component at build time, so the reader bundle
// never ships the MDX compiler. The remark plugin set must match the editor's
// runtime renderer (@nocms/renderer) so preview and published output agree —
// here that means stripping frontmatter the same way. Project Pages serve under
// /<repo>/, so base is set from an env var in CI and defaults to "/" locally.
const here = path.dirname(fileURLToPath(import.meta.url));

// `@nocms/components|renderer|tokens` ship to a fork as committed vendor bundles
// (D1). Inside the monorepo dev server those bundles are the wrong thing to load:
// they're pre-built, so Vite caches them immutably under a content-independent
// `?v=` hash and re-vendoring never invalidates the browser copy — and esbuild's
// isolated dep optimization strips properties only read cross-package (a block's
// `schema`/`slots`, consumed by @nocms/editor). Resolve them to live workspace
// source in dev instead, so the in-site editor always reflects current code.
// A fork (no `../../packages`) falls through to the vendored bundles unchanged.
const VENDORED_IN_DEV = ["components", "renderer", "tokens"] as const;

export default defineConfig(({ command }) => {
  const monorepo =
    command === "serve" &&
    existsSync(path.resolve(here, "../../packages/components/src/index.ts"));

  const alias = monorepo
    ? Object.fromEntries(
        VENDORED_IN_DEV.map((name) => [
          `@nocms/${name}`,
          path.resolve(here, `../../packages/${name}/src/index.ts`),
        ]),
      )
    : {};

  return {
    base: process.env.BASE_PATH ?? "/",
    resolve: { alias },
    // For a fork (bundles loaded as real file: deps), keep Vite from re-optimizing
    // the already-built vendor bundles — esbuild DCE would strip cross-package
    // properties as above. In the monorepo the alias above sidesteps this entirely.
    optimizeDeps: {
      exclude: [
        "@nocms/components",
        "@nocms/renderer",
        "@nocms/tokens",
        "@nocms/build",
      ],
    },
    plugins: [
      {
        enforce: "pre",
        ...mdx({ jsxImportSource: "preact", remarkPlugins: [remarkFrontmatter] }),
      },
      preact(),
    ],
  };
});
