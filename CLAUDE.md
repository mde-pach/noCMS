# CLAUDE.md

How to build noCMS. This file is **self-contained and durable**: it holds the architecture
invariants and working conventions directly, so it stays correct even if other docs move or
are removed. Project overview lives in @README.md; commands in @package.json. External
platform constraints the code can't carry live in @.claude/rules/platform-facts.md.

## What noCMS is

A decentralized, git-backed CMS: someone builds and manages a real website for free on
GitHub, edits it in-site, and publishes with one click — with nothing centralized to
maintain. The repo is the database; GitHub (git, REST/GraphQL API, Actions, Pages) is the
backend. noCMS is software people adopt, not a service they depend on. Open source, MIT.

## Non-goals

- Not a hosted SaaS or central studio; no central app a site depends on. Not commercial — no
  marketplace, monetization, or paid service (plugins are extensibility, not revenue).
- Not multi-tenant or anonymous editing: the editor is the authenticated repo owner, editing
  their own repo.
- Not a system that makes the adopter provision or pay for third-party infra (no per-site
  Netlify/Vercel/Cloudflare metering).
- Out of scope for v1: real-time multi-editor collaboration (needs a CRDT/P2P layer), end-user
  authoring of arbitrary custom components (compose from the library/plugins instead), and
  commerce/checkout (Pages ToS forbids it — see `.claude/rules/platform-facts.md`).

## Architecture invariants (do not break)

1. **One renderer, two moments.** The editor previews by rendering an MDX→Preact tree live
   in the browser; the publish build prerenders the *identical* tree to static HTML with
   `preact-render-to-string`, then hydrates islands. Never introduce a second renderer or
   component model — "what you preview is what you publish" is the core correctness property.
2. **Decentralized.** The editor ships *with* each site; there is no central app a site
   depends on. The only shared infra is a *stateless* auth relay, and it is optional and
   replaceable (self-host, or PAT fallback). Nothing the project runs may break a site.
3. **Instant edit, async publish.** Editing, preview, and theming are runtime in the browser
   — no build. Publishing is a discrete, asynchronous GitHub Action. **Token theming is
   runtime CSS variables and must never trigger a rebuild.**
4. **The repo is the database; GitHub is the backend.** Versioned storage = git history,
   compute = Actions, hosting = Pages. No database, no second backend service.
5. **Text, not JSON, for layout and tokens.** Layout is MDX/JSX (diffs/merges line-by-line);
   tokens are a flat one-token-per-line file used as the source of truth (DTCG is *generated*
   from it for interop, never the reverse). Never store layout or tokens as a JSON tree.
6. **Tier discipline — push work down a tier.** ① runtime in-browser (render, routing, CSS-var
   theming); ② batch in Actions (search, i18n, manifests, feeds — output is just files served
   at runtime); ③ build/publish (SSG HTML, image optimization). Precompute in ② what looks
   like it needs ③; serve from ① what ② produced.
7. **Client-side GitHub, stateless relay.** All reads and writes hit `api.github.com` from the
   browser with the owner's token. The relay performs *only* the OAuth code↔token exchange and
   refresh — it holds no session. Auth is PKCE + short-lived rotating tokens; a PAT is the
   zero-relay fallback.
8. **Plugins are a security boundary.** Plugin/extension code runs sandboxed (capability-scoped
   postMessage API); it never receives the GitHub token, host DOM, or network by default. The
   token lives only in the host/auth context.
9. **Everything is public on the free path.** A public repo means content, drafts, branches,
   and history are world-readable. Don't design features that assume private staging.
10. **Components integrate by type.** Editor controls are derived by parsing component
    TypeScript prop types — no annotation DSL. A thin optional field-config is the only escape
    hatch.

## Package map

Monorepo, Bun workspaces. Each package's `src/index.ts` is its **deliberate, minimal public
API** — cross-package use goes through that seam only.

- `packages/core` — shared types + content-collection schema (valibot). The shared vocabulary.
- `packages/renderer` — the single MDX→Preact engine (browser preview + Node prerender).
- `packages/tokens` — flat token file ↔ CSS variables ↔ DTCG interop.
- `packages/props-discovery` — component TS types → editor controls.
- `packages/components` — curated, props-discoverable component library.
- `packages/editor` — in-site WYSIWYG + visual layout + live token theming.
- `packages/github` — browser GitHub client; branch-per-session commits.
- `packages/auth` — client-side PKCE + short-lived token lifecycle.
- `packages/build` — Vite + Preact SSG publish pipeline.
- `packages/derive` — ② tier: search, i18n, manifests, feeds.
- `packages/sandbox` — plugin sandbox host.
- `apps/relay` — the only infra: stateless PKCE exchange. See @.claude/rules/relay.md.
- `templates/starter` — the fork-and-go starter site that ships the editor. Depends on
  `@nocms/*` via committed `file:./vendor/*` built bundles, not `workspace:*`, so a fork
  is self-contained (D1); `scripts/vendor.ts` regenerates them in the monorepo.

## Code style

- **Boundaries first.** Keep packages decoupled; depend on another package's `index.ts`, never
  reach into its internals. If two packages need the same thing, it belongs in `core`.
- **Compose small.** Prefer small, pure, named functions over large stateful ones. Inject
  dependencies (clients, fs, fetch); keep side effects (network, disk, DOM) at the edges so the
  core stays testable.
- **Testability is a design constraint**, not an afterthought. Colocate `*.test.ts` next to the
  code; use vitest. A unit that's hard to test is usually a boundary that's drawn wrong.
- **TypeScript:** explicit narrow types at module boundaries; infer locally. Strict mode is on
  (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`) — use `import type` for type-only imports.
- **Biome owns formatting, lint, and import order.** Never hand-format or fight it.
- Prefer Bun / platform / stdlib over a new dependency; justify any dep you add.
- Match the surrounding code; don't add a second pattern for a job already solved here.

## Comments (the main rule)

- Default to **no comment**. Code should read on its own.
- Comment only the *why* of something non-obvious — a constraint, gotcha, or tradeoff. Never
  narrate *what* the next line does.
- Comments must be **standalone**: never reference an external document or section marker. If a
  comment only makes sense with another doc open, rewrite or delete it.
- Delete section banners, decorative dividers, name-restating prose, play-by-play, and
  TODO-filler. If a comment explains *what*, the fix is a clearer name or a smaller function.
- Durable knowledge goes in a README or a `.claude/rules/` file, not in comment soup.

## Commands

- Install: `bun install` (CI: `bun install --frozen-lockfile`)
- Dev (starter site): `bun run dev`
- Build (starter site): `bun run build`
- Lint + format + autofix: `bun run check` — Biome owns this
- Typecheck all packages: `bun run typecheck`
- Test: `bun run test`
- Full gate: `bun run verify` (Biome + typecheck + tests) — must be clean before "done"
- Per-package: `bun --filter '@nocms/<pkg>' <script>`

## Workflow

- A `Stop` hook runs `bun run verify` when uncommitted source changed; don't finish on a broken
  tree. A `PostToolUse` hook auto-runs `biome check --write` on edited files.
- Before declaring work done: `bun run verify` clean.
- When an invariant or a deferred decision is settled, record it here — keep this file under
  ~200 lines; push path-specific detail into `.claude/rules/`.
