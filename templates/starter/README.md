# noCMS starter

Fork this to your GitHub account to get a noCMS site. Sign in with GitHub and edit it in
place; publishing builds the public site to GitHub Pages via Actions.

```bash
bun install
bun --filter '@nocms/starter' dev     # runtime preview at http://localhost:5173
bun --filter '@nocms/starter' build   # static build to dist/
```

- `content/` — your MDX content. The default locale lives at the root; other locales under
  their own directory (`content/fr/…`). A `<LanguageSwitcher/>` or `<LatestPosts/>` dropped
  into content renders the batch-tier i18n/feed data at runtime.
- `nocms.config.json` — the site-config seam: `base`, `siteUrl`, `locales` (first = default),
  and `feed`. Read by the build (③) and the derive jobs (②).
- `theme.tokens` — the flat, one-token-per-line theme source (edited live in the editor).
- `public/` — static assets served at the site root, **including the committed ② derived files**
  (`feed.json`, `i18n/*.json`, `search.json`, `sitemap.xml`, `manifest.json`). Regenerate them
  from content with `bun run derive`. (In a real fork these are produced by the publish Action.)
- `src/` — the site shell that renders content and hosts the editor.
- `vendor/` — the `@nocms/*` packages, built and committed as self-contained `file:`
  packages. A fork has no monorepo to resolve `@nocms/*` from, so the runtime ships
  with the site. Don't hand-edit them.

### Vendored packages

The starter depends on `@nocms/*` via `file:./vendor/<pkg>`, not `workspace:*`, so a
fork installs and builds with nothing but this directory. The bundles are regenerated
by `scripts/vendor.ts`, which `predev`/`prebuild` run automatically:

- **In this monorepo**, it rebuilds the bundles from `../../packages/*` — so edits to a
  package flow into the starter on the next `dev`/`build` (or `bun run vendor`).
- **In a fork**, the monorepo sources are absent, so it's a no-op and the committed
  bundles are used as-is.
