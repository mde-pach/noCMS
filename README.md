# noCMS

> A **decentralized, git-backed CMS** that lets someone build and manage a real website
> for free on GitHub — edited in-site, published with one click, with nothing centralized
> for anyone to maintain.

The repo is the database. GitHub's own subsystems (git, the API, Actions, Pages) are the
backend. Each site is self-contained and self-hosted on the owner's GitHub; noCMS is
software people adopt, not a service they depend on.

noCMS is **open source (MIT) and free for everyone**: no marketplace, no monetization, no
commercial service.

Architecture invariants and working conventions live in [`CLAUDE.md`](./CLAUDE.md). This
README documents the **code layout** as it gets built.

## The one correctness property

> **What you preview is what you publish.**

The editor previews by rendering the MDX→Preact tree live in the browser. The publish
build prerenders the **identical** tree to static HTML with `preact-render-to-string`, then
hydrates interactive parts as islands. One component model, one renderer — see
[`@nocms/renderer`](./packages/renderer).

## Layout

```
packages/
  core              shared types + content collection schema (valibot)
  renderer          the single MDX→Preact engine (browser preview + Node prerender)
  tokens            flat token file ↔ CSS variables ↔ DTCG interop export
  controls          valibot schema → editor controls + content-path enumeration
  components        curated, schema-discoverable component library
  style-controls    headless Tailwind v4 styling engine → Style panel controls
  editor            in-site WYSIWYG + visual layout + live token theming
  github            REST/GraphQL client; branch-per-session commits
  auth              client-side PKCE flow + short-lived token lifecycle
  build             Vite + Preact SSG publish pipeline (prerender + islands)
  derive            batch tier: search index, i18n bundles, manifests, feeds
  router            content-derived route table + client-side navigation
  prose             in-place rich-text editing (ProseMirror ↔ inline MDX)
  session           sign-in → load → branch-per-session → commit → publish
  sandbox           plugin sandbox host (iframe + capability-scoped postMessage API)
apps/
  relay             the only infra: stateless PKCE code↔token exchange
templates/
  starter           the fork-and-go starter site that ships the editor
```

## Tier model (where computation runs)

- **① Client (view-time):** MDX render, client routing, live CSS-variable token theming. No build.
- **② Batch (in Actions):** functions of the whole corpus, staleness-tolerant — search,
  i18n, manifests, feeds. Output is just more files. → `packages/derive`
- **③ Build/Publish (per "Publish changes"):** SEO-ready static HTML, image optimization.
  Prerenders the *same* component tree the editor previews. → `packages/build`

## Develop

Requires [Bun](https://bun.sh) ≥ 1.3.

```bash
bun install         # install the whole workspace
bun run dev         # run the starter site (templates/starter) in the editor's runtime preview
bun run build       # build the starter site to static HTML (the publish path)
bun run verify      # biome + typecheck + tests
```

Per-package scripts run through Bun's workspace filter, e.g.:

```bash
bun --filter '@nocms/renderer' test
bun --filter 'apps/relay' dev
```

## Status

Under active development. The architecture is settled (see [`CLAUDE.md`](./CLAUDE.md));
implementation details are decided while building and recorded in
[`DECISIONS.md`](./DECISIONS.md). Each package's `index.ts` is its public contract. For
milestone-by-milestone build status — what's done, wired, or still open — see
[`docs/ROADMAP.md`](./docs/ROADMAP.md).

## License

[MIT](./LICENSE)
