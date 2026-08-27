# noCMS — Implementation Roadmap

Turns the vision + the specs in `docs/specs/` into an actionable build order. This is a *planning* doc: it
sequences work, names the critical path, and marks what's already built versus to-build. It
complements `VISION.md` (the what), the specs in `docs/specs/` (the how), and `DECISIONS.md`
(the why). Milestones are demoable checkpoints, not calendar dates.

> **Sequencing principle:** build along the **critical path** — the shortest spine from
> nothing to "a non-developer created a site, built a page, and published it." Everything
> off that spine is a parallel track that merges in when its dependency lands.

## Status at a glance (as of D26)

The engine is built and the **edit half of the spine works**: open a repo's page → canvas →
inline edit → insert via `/` → reorder → change a prop → serialize to canonical MDX. The
**publish half is built as packages but not yet wired into the editor** — `@nocms/session`
(`openEditingSession`/`connectGitHub`) and `@nocms/github` exist, but the starter's editor leaves
the save seam stubbed (`onChange` logs to the console; the top-bar "Publish" runs a UI animation,
not a commit). Closing that wiring is the top remaining critical-path task — it's what turns "you
can edit" into "you can publish a real site."

| Milestone | State |
|---|---|
| M0 schema→control mapper | **Mapper done** — `@nocms/controls` + meta-type stamping (D26). Content conventions (`content/globals/` route skip, `nav.*` frontmatter vocabulary) **not yet built**. |
| M1 bricks + tokens | **Done** — 19 primitives + 8 sections; token role contract + `@mode`. |
| M2 authoring shell | **Done** — full in-place shell (canvas, selection, inline edit, insert, drag, inspector, Style panel). |
| M3 publish loop | **Engine done, unwired** — session/github/build exist; the editor→commit→Pages path is stubbed. |
| M4 content & media | **UI shells only** — `MediaPicker`/`Navigator`/`PageRail` render; the pipelines (resize/hash/commit, nav + collections persistence) are not built. |
| M5 onboarding | **Infra-gated** — needs the GitHub App + relay hosting, not code. |

## The critical path

```
M0 core mapper ─▶ M1 bricks ─▶ M2 authoring shell ─▶ M3 publish loop ─▶ M5 onboarding
                                      │
                                      └─▶ M4 content & media (parallel once the shell exists)
```

One sentence: **derive controls from schemas → build the bricks → compose them on a canvas →
publish to Pages → wrap it in a zero-to-live onboarding.** M4 (content/media) and the infra
track run alongside; M5 lands users into what M2/M3 already made real.

## Build strategy: tracer-slice first (D16)

**Do not build the milestones layer-by-layer.** Build one thin *vertical* slice through the entire
loop first, then widen. The milestones below are **breadth added to a working core, not blind
gates** — "prove the spine, then widen it."

**The tracer slice**, on a *pre-existing* repo:

> open an existing repo's page → it renders on the canvas → select a block, edit text inline →
> insert a block via `/` → reorder → change a prop → serialize to **canonical MDX** → commit →
> publish to Pages → see it live.

**Built up to `serialize`; the `commit → publish → live` tail is the open end.** Everything from
"open the page" through "serialize to canonical MDX" works in the browser today (M0–M2). What
remains of the slice is wiring the editor's save seam to `@nocms/session` so an edit actually
commits and a publish actually runs the Action — the existential round-trip risk (does editing over
MDX *feel* good and round-trip cleanly, D15) is retired; the *delivery* risk is not yet exercised
end-to-end.

Why this slice mattered first: it retired the existential risk — *does visual editing over MDX feel
good AND round-trip cleanly?*, including canonical-serializer determinism (D15) — before any breadth
was built. The remaining breadth (media, collections, structure, SEO, design panel, plugins) is
additive on a spine already proven through serialization.

## What exists now

All 15 packages are built and tested; there is no green-field engine work left. The remaining work
is **wiring already-built engine into the editor flow, then product breadth.**

- **Engine, complete:** `renderer` (one MDX→Preact engine), `github` (`createGitHubClient`), `auth`
  (PKCE + PAT), `build` (SSG + island hydration), `derive` (search/i18n/manifests/feeds/sitemaps),
  `session` (`openEditingSession`/`connectGitHub`), `tokens` (parse/css-vars/DTCG/`@mode`), `sandbox`
  (iframe + capabilities), `core` (vocabulary: `FieldDef`/`CollectionDef`/routes), `controls`
  (schema→control mapper, D26), `style-controls` (headless Tailwind engine, D26), `router`, `prose`.
- **Editor, a full shell:** `@nocms/editor` mounts an in-place WYSIWYG over the rendered page —
  canvas, selection, inline prose edit, slash-insert, drag-reorder, inspector props panel, Style
  panel, plus `MediaPicker`/`Navigator`/`PageRail` UI shells.
- **Components:** 19 primitives + 8 page-role sections, valibot-schema-driven and token-styled.
- **The seam that's still open:** the editor exposes `onChange`/publish as a *seam*; the starter
  wires neither to `@nocms/session`. So the engine can commit and publish, but nothing in the
  running editor invokes it yet. That wiring — not new engine code — is M3's remaining work.

## Milestones

### M0 — Foundations: the schema→control keystone *(critical path; unblocks everything)*
**Realizes:** `controls-system` (D9), content conventions (D11).
**Status:** Mapper done — `@nocms/controls.deriveControls` and `schemaForField` meta-type stamping
both shipped. **Open:** the content conventions below — the route mapper does not skip
`content/globals/`, and the `nav.*` frontmatter vocabulary is unimplemented (only the
`nocms.config.json` loader exists).
**Build:**
- ~~`deriveControls` + `schemaForField` meta-type stamping~~ — **done** (D26); `schemaForField`
  now stamps `media`/`markdown`/`reference`/`date` controls instead of flattening to `v.string()`.
- `core`: content conventions — **still open:** route mapper skips `content/globals/`; `nav.*`
  frontmatter vocabulary (`label`/`order`/`parent`/`hidden`); collection defs read from
  `nocms.config.json` (only the config *loader* exists today).
- `controls`: **done (D26)** — extracted `@nocms/controls`, the valibot schema-introspection mapper
  (`deriveControls`); the TS-source-parsing `props-discovery` was deleted. (Realizes invariant #10.)
**Demo:** feed a component's valibot schema in, get correct controls out (incl. a token-bound
`color`, a `range`, a nested group). Unit-level, but it's the spine.

### M1 — The brick set: curated components + tokens *(parallel once M0 conventions land)*
**Realizes:** `component-library`, `design-theming` (token contract + D12).
**Status:** Done — 19 primitives + 8 page sections, each valibot-schema-driven and token-styled;
the token role contract and `@mode` dark-mode extension are live in `@nocms/tokens`. Component
*breadth/polish* can keep growing, but the milestone's contract is met.
**Build:**
- `tokens`: the role contract (`bg`/`surface`/`text`/`muted`/`primary`/`on-primary`/`border`/
  `accent` + ramps); the `@mode` dark-mode extension (D12) in `parseTokens` + `toCssVariables`.
- `components`: grow from 16 primitives → the ~20 primitives + ~13 page-role sections, each
  with a valibot props schema (D9), token-only styling, island-only-if-interactive, seed content.
**Demo:** the section-library palette renders real thumbnails through the one renderer; a
component's panel is fully derived; flipping a token restyles live; dark mode toggles.

### M2 — The authoring shell *(critical path; the daily product)*
**Realizes:** `authoring-shell`.
**Status:** Done — `mountEditor` assembles the full in-place shell (canvas selection, inline prose
edit, slash-insert, drag-reorder under one tree-transform + undo model, the inspector props panel,
and the Style panel). This is the proven part of the spine.
**Build (`editor`):** assemble the primitives into the shell — canvas selection + inline text
edit + drag-reorder (one tree-transform model, uniform undo); the insert palette (slash menu
primary, `+` handles); the section-library browser; the inspector props panel (consumes M0/M1);
the L2 design fold.
**Demo:** build a page by inserting Hero + Features, edit headlines inline, reorder, change a
prop and a token. This is the core "it works" moment.

### M3 — The publish loop *(critical path; makes it real — THE top open task)*
**Realizes:** `publish-loop` (D13 conflict policy, D7).
**Status:** Engine built, **not wired**. `@nocms/session` (`openEditingSession`/`connectGitHub`),
`@nocms/github` (`createGitHubClient`), and `@nocms/build` (SSG) all exist, but the editor never
calls them: the starter's `mountEditor` leaves `onChange` as a `console.info` and the top-bar
"Publish" runs a UI animation (`chrome.beginPublish()`), not a commit. **Next task:** wire the save
seam → session → branch commit → publish Action, then the draft/live + changeset + rollback UX.
**Build:** mostly UX over existing `session`/`github`/`build` — draft (session branch) vs live
(Pages), autosave commits ("all changes saved"), one-click publish → Action → Pages,
human-readable "what changed", rollback as forward-revert, conflict = ask-on-same-section (D13).
Plus the small **render-at-SHA preview runtime** (boots the one renderer against a public-API
tree; reviewer-scale).
**Demo:** publish a page to a real `*.github.io` URL; share a preview link; roll a publish back.

### M4 — Content & media management *(parallel with M3 once M2 exists)*
**Realizes:** `structure`, `media` (D11, D13).
**Status:** UI shells only. `MediaPicker`, `Navigator`, and `PageRail` render in `@nocms/editor`,
but the pipelines behind them don't exist: `MediaPicker` is fed a hardcoded list and its Upload
buttons have no handler (no client-side resize, content-hash, blob commit, or SVG sanitize), and
there is no nav/page/collection persistence. All real work here is still to build.
**Build:**
- `editor`+`core`: page CRUD, slug/route management, nav editor, globals (header/footer),
  collections UI (entry forms reuse M0's mapper).
- media: client-side resize-before-commit → content-hash `assets/`, media library, alt text,
  embed-by-URL, SVG sanitize via DOMPurify (D13).
**Demo:** a multipage site with navigation, images, and a collection — managed entirely in-browser.

### M5 — Onboarding + distribution + settings *(critical path tail; lands real users)*
**Realizes:** `onboarding` (D10), `seo-and-search`, `settings`.
**Status:** Not started; gated on the infra track (GitHub App registration + relay/launcher
hosting), not on more engine code.
**Build:**
- the **launcher** (stateless page) + `auth` GitHub App + `github`: one-screen install+authorize,
  `/generate` from template, `POST /pages` enable, write `siteUrl`, hand off into the M2 editor
  (instant edit before first build finishes); plain-language education at each step.
- SEO: per-page meta in frontmatter with content-derived defaults; the search island (consumes
  derive's `search.json`); crawl posture noindex-until-first-publish (D13).
- `settings`: site metadata, account/session, ownership-first danger zone.
**Demo:** a brand-new non-developer goes zero → live, end to end.

## Parallel tracks

- **Infra / owner actions** (can start now, gate only M5): register the `noCMS`-org GitHub App
  with the D10 permission set + OAuth-during-install; deploy the relay + launcher hosting; mark
  `templates/starter` as a template repo; run the **two empirical checks** (selected-vs-all-repos
  install behaviour; `build_type:"workflow"` on a fresh repo).
- **Design** (running now): Claude Design exploration of the M2 shell, M1 section library, and M5
  onboarding → `/design-sync` into conformant components (VISION design workflow). Feeds M1/M2/M5.
- **Within milestones:** M1 (tokens) ∥ M1 (components); M4 (structure) ∥ M4 (media); SEO ∥ settings.

## Deferred (post-v1)

Plugin build-out (seam specced, D14) · form-submission backends (self-host) · custom domain ·
i18n authoring UI · scheduled publish · OG-image generation · plugin marketplace/discovery ·
rich-content capabilities via the **D17 library pattern** (e.g. `shiki` syntax highlighting, GFM
extensions) — wired into *both* the editor renderer and publish so WYSIWYG holds · publish-side
responsive image optimization (`sharp`/`unpic`) layered on M4's commit-time resize.

## Risks & gates

- **M5 is gated on the infra track**, not on more code — start the GitHub App registration +
  empirical checks early so onboarding isn't blocked when M2/M3 are ready.
- **`@nocms/tokens` `@mode` syntax** (D12) and **valibot-introspection stability** (controls-system
  open question) are the two API details to pin before M0/M1 harden — wrap valibot introspection
  behind a one-file adapter so a version bump can't ripple.
- **Don't let the component library go mediocre** (the research's core failure mode) — M1 quality
  is the product's first impression; curate hard, lean on the Claude Design track.
- **Keep the publish assembler swappable (D17).** The build engine is a portable seam (pre-built
  atoms + the `data-island` marker contract + canonical AST), now guarded by an
  assembler-parity test in `@nocms/renderer`. Before adding any *content-changing* build
  capability, wire it into **both** moments and close **D2c** (deterministic serialization) so the
  editor and publish — and git diffs — can't drift.
