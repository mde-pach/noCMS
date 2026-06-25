# @nocms/build

The Vite + Preact SSG publish pipeline, run in GitHub Actions. Prerenders the renderer's tree to static HTML and hydrates islands. Wires the build-tier Vite plugins: MDX (@mdx-js/rollup), image optimization, sitemap/RSS, SEO/first-paint.

Islands: `prerenderRoutes` wraps registry islands so their roots emit hydration markers + serialized props, reads the per-page island set back from those markers, and injects the island client `<script>` only into pages with islands (island-free pages stay byte-identical, ship zero JS). `island-client.ts` is the browser hydration entry, bundled at vendor time and served as `dist/_nocms/islands.js`; `nocmsVitePlugins()` exposes it as the `virtual:nocms-islands` module. See `.claude/rules/islands.md`.

Site config: `buildSite` reads `nocms.config.json` from the site root (the same way it reads `theme.tokens`/`head.html`), so `base`/`siteUrl`/`feed` come from the one site-config seam (`@nocms/core`); the `base` option is an optional override for CI's `BASE_PATH`. From the config it injects, into each page `<head>`, the feed discovery `<link rel="alternate">` and a `<script id="nocms-site">` carrying the base-relative URLs of the ② derived files the runtime consumers (`@nocms/components`'s `LanguageSwitcher`/`LatestPosts`) fetch — each only when its artifact is produced. The derived files themselves are served from `public/` (copied to `dist/` root).

The public API is `src/index.ts` — depend on that, not internals. Architecture invariants and conventions live in the repo `CLAUDE.md`.
