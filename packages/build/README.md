# @nocms/build

The Vite + Preact SSG publish pipeline, run in GitHub Actions. Prerenders the renderer's tree to static HTML and hydrates islands. Wires the build-tier Vite plugins: MDX (@mdx-js/rollup), image optimization, sitemap/RSS, SEO/first-paint.

The public API is `src/index.ts` — depend on that, not internals. Architecture invariants and conventions live in the repo `CLAUDE.md`.
