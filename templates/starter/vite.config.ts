import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mdx from "@mdx-js/rollup";
import preact from "@preact/preset-vite";
import remarkFrontmatter from "remark-frontmatter";
import { defineConfig, type Plugin } from "vite";

// `content/*.mdx?raw` must yield the file's *text* — the editor edits MDX source, not a compiled
// component. Vite's built-in `?raw` doesn't help: the `@mdx-js/rollup` plugin strips the query
// (`id.split('?')`) before filtering, so it compiles `index.mdx?raw` as MDX anyway. So resolve
// the request to a virtual module with a non-`.mdx` extension — which the MDX plugin skips — and
// load the raw bytes ourselves.
const RAW_PREFIX = "\0nocms-raw:";
function rawMdxPlugin(): Plugin {
  return {
    name: "nocms-raw-mdx",
    enforce: "pre",
    resolveId(source, importer) {
      if (!source.endsWith(".mdx?raw") || !importer) return null;
      const abs = path.resolve(path.dirname(importer), source.slice(0, -"?raw".length));
      return RAW_PREFIX + abs.replace(/\.mdx$/, ".mdxraw");
    },
    load(id) {
      if (!id.startsWith(RAW_PREFIX)) return null;
      const file = id.slice(RAW_PREFIX.length).replace(/\.mdxraw$/, ".mdx");
      this.addWatchFile(file);
      return `export default ${JSON.stringify(readFileSync(file, "utf8"))};`;
    },
  };
}

// The remark plugin set below must match the editor's runtime renderer (@nocms/renderer) so
// preview and published output agree — here, stripping frontmatter the same way.
const here = path.dirname(fileURLToPath(import.meta.url));

// `@nocms/components|renderer|tokens` ship to a fork as committed vendor bundles. Inside the
// monorepo dev server those bundles are the wrong thing to load: they're pre-built, so Vite
// caches them immutably under a content-independent `?v=` hash and re-vendoring never invalidates
// the browser copy — and esbuild's isolated dep optimization strips properties only read
// cross-package (a block's `schema`/`slots`, consumed by @nocms/editor). Resolve them to live
// workspace source in dev instead, so the in-site editor always reflects current code. A fork
// (no `../../packages`) falls through to the vendored bundles unchanged.
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
    // For a fork (bundles loaded as real file: deps), keep Vite from re-optimizing the vendor
    // bundles — esbuild DCE would strip cross-package properties as above. In the monorepo the
    // alias sidesteps this entirely.
    optimizeDeps: {
      exclude: [
        "@nocms/components",
        "@nocms/renderer",
        "@nocms/tokens",
        "@nocms/build",
      ],
    },
    plugins: [
      rawMdxPlugin(),
      {
        enforce: "pre",
        ...mdx({ jsxImportSource: "preact", remarkPlugins: [remarkFrontmatter] }),
      },
      preact(),
    ],
  };
});
