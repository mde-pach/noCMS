# noCMS starter

Fork this to your GitHub account to get a noCMS site. Sign in with GitHub and edit it in
place; publishing builds the public site to GitHub Pages via Actions.

```bash
bun install
bun --filter '@nocms/starter' dev     # runtime preview at http://localhost:5173
bun --filter '@nocms/starter' build   # static build to dist/
```

- `content/` — your MDX content.
- `theme.tokens` — the flat, one-token-per-line theme source (edited live in the editor).
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
