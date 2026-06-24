# Continuation prompt — noCMS

> Paste this as the first message of a fresh session (or read it as the first
> action). It is a working handoff and may be deleted/rewritten as work moves on.
> It assumes nothing from prior chat; everything needed is here or in the files it
> points to.

## Your task

Continue building noCMS. **Read `CLAUDE.md` first** — it holds the architecture
invariants and the code-style/comment/workflow rules, and is the source of truth
(do not depend on `noCMSVISION.md`, which is background being retired). Then read
`DECISIONS.md` for the open decisions. Then `bun install && bun run verify` to
confirm a green baseline before changing anything.

## Working agreement (the owner, Maxime)

- **Work autonomously; commit each tested unit** (message style: see `git log`).
  End every unit on a clean `bun run verify` (Biome + typecheck + tests).
- **Do the straightforward, decision-free work.** For any *big* decision, do NOT
  guess — record/ýrefine it in `DECISIONS.md` and wait for Maxime. (He'll point you
  at the next one.)
- **Code values:** readability, composition, testability; clean package boundaries,
  decoupling, narrow public APIs (`src/index.ts` is each package's contract).
  Dependencies are injected (fetch, clock, crypto) so logic unit-tests without
  network/DOM. Keep only declared deps that are actually used.
- **Comments:** minimal, standalone, *why* not *what*; never reference an external
  doc. Durable knowledge → README or `.claude/rules/`.
- A `Stop` hook runs `bun run verify` on uncommitted source; a `PostToolUse` hook
  runs Biome on edited files. Don't fight Biome (it owns format + import order).

## State (branch `feat/initial-implementation`, 54 tests green)

Implemented, tested, committed — all the decision-free packages:
`core` (types, content loader, collection→valibot validation), `tokens`
(parse/CSS-vars/DTCG), `renderer` (the one MDX→Preact engine + preview/publish
parity test), `github` (REST/GraphQL read/branch/commit/publish), `auth` (PKCE +
relay exchange/refresh + PAT), `props-discovery` (TS types→controls via the TS
compiler API), `components` (Hero/Callout/Button + registry), `build`
(`prerenderRoutes` SSG core), `derive` (manifest job), `apps/relay` (stateless
PKCE exchange), `templates/starter` (full vertical: MDX + components + live token
theming, browser-verified).

Every package's core function is real except the ones gated by decisions below,
which still throw `not implemented`.

## Where to resume (in order)

1. **D1 — distribution model** (gates the most). Forked `templates/starter` can't
   resolve `@nocms/*` (`workspace:*`). Decide: publish to npm / vendor a built
   bundle / runtime-fetch a pinned build. Maxime decides; then wire it.
2. **D2 — editor.** Proposal already written in `DECISIONS.md` (studied cat-next's
   TipTap editor: adopt descriptor-driven + render-real-component, but invert the
   data model to MDX-text/AST — ProseMirror-JSON would break invariant #5). Before
   building: **prototype D2b — verify a remark/mdast MDX round-trip is lossless on
   JSX blocks/attrs/expressions.** Reuse `@nocms/renderer` (canvas) and
   `@nocms/props-discovery` (controls). Map selection via remark source positions,
   not DOM value-search.
3. Then **D6** full Vite SSG `buildSite`, **D3** search/i18n, **D5** routing,
   **D4** sandbox — each per `DECISIONS.md`.

## Gotchas already learned (don't rediscover)

- **Bun workspaces**: deps don't sit at top-level `node_modules`; test runtime APIs
  via `bun -e` from inside the package, not `node`. CI uses `--frozen-lockfile`.
- **MDX runtime**: `@mdx-js/mdx` `evaluate(mdx, { ...preact/jsx-runtime })` returns
  the component as `default`; pass `components` as a prop to map tags.
- **Frontmatter parity**: the starter compiles MDX at *build* via `@mdx-js/rollup`
  and must use the **same** remark plugins as `@nocms/renderer`
  (`remark-frontmatter`) or preview/publish diverge. This is the invariant-#1 trap.
- **valibot**: `v.optional(pipe, default)` — the default must be the *input* type
  (e.g. `"3000"` for a string→number pipe), not the output.
- **Biome**: `noSvgWithoutTitle` (SVGs need `<title>`); `noNonNullAssertion` and
  `noAssignInExpressions` are errors — use guards, not `!`/`??=`-in-expression.
- **noUncheckedIndexedAccess** is on — array/match/destructure access is `T|undefined`.
- Per-package check (`biome check --write packages/x`) won't catch everything; run
  full `bun run verify` before committing.

## Reference repos (study, don't copy)

- `github.com/mde-pach/wiki-n-go` — Maxime's Bun/Biome/relay/Pages idioms (Astro
  renderer, which noCMS deliberately does not use).
- `/Users/maximedepachtere/project/papernest/cat-next/apps/front/features/editor`
  — TipTap editor POC; engine inspiration only (see D2).
