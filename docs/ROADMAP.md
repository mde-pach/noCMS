# noCMS — Implementation Roadmap

Turns the vision + 11 specs into an actionable build order. This is a *planning* doc: it
sequences work, names the critical path, and marks what's already built versus to-build. It
complements `VISION.md` (the what), the specs in `docs/specs/` (the how), and `DECISIONS.md`
(the why). Milestones are demoable checkpoints, not calendar dates.

> **Sequencing principle:** build along the **critical path** — the shortest spine from
> nothing to "a non-developer created a site, built a page, and published it." Everything
> off that spine is a parallel track that merges in when its dependency lands.

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

**The tracer slice** (the first thing to build, on a *pre-existing* repo):

> open an existing repo's page → it renders on the canvas → select a block, edit text inline →
> insert a block via `/` → reorder → change a prop → serialize to **canonical MDX** → commit →
> publish to Pages → see it live.

Just **~5 blocks** (`Section`, `Stack`, `Heading`, `Text`, `Image`/`Button`). **No** onboarding,
media, collections, structure, SEO, design panel, or plugins.

Why first: it retires the existential risk — *does visual editing over MDX feel good AND round-trip
cleanly?* — including the canonical-serializer determinism (D15), on day one. It produces something
to *feel* in weeks, not after all of M0–M5. Everything else is additive. If the spine feels wrong,
you find out before building the breadth. The slice cuts through M0 (a minimal mapper), M1 (5
blocks), M2 (a minimal shell), and M3 (a minimal publish) at once.

## What already exists (engine, from the survey)

Substantial. `renderer` (one MDX→Preact engine), `github` (`createCommitOnBranch`), `auth`
(PKCE + PAT), `build` (SSG), `derive` (search/sitemap/i18n/feed — strong), `session`
(branch→commit→publish), `tokens` (parse/css-vars/DTCG), `sandbox` (iframe + capabilities),
`core` (`FieldDef`/`CollectionDef`/routes), plus editor *primitives* (canvas, selection,
props-panel, tokens-panel) and 16 component primitives. The roadmap is mostly **product
surface + the core mapper rework + component buildout**, not green-field engine work.

## Milestones

### M0 — Foundations: the schema→control keystone *(critical path; unblocks everything)*
**Realizes:** `controls-system` (D9), content conventions (D11).
**Build:**
- `core`: implement `deriveControls(schema) → ControlDescriptor[]` (the one mapper, two
  callers). **First concrete task:** enrich `schemaForField` to stamp meta-types — today it
  flattens `media`/`markdown`/`reference` to bare `v.string()`, losing the intent controls need.
- `core`: content conventions — route mapper skips `content/globals/`; `nav.*` frontmatter
  vocabulary (`label`/`order`/`parent`/`hidden`); collection defs read from `nocms.config.json`.
- `props-discovery`: rework from TS-source parsing → valibot schema introspection, consuming
  `deriveControls`. (Updates invariant #10's realization.)
**Demo:** feed a component's valibot schema in, get correct controls out (incl. a token-bound
`color`, a `range`, a nested group). Unit-level, but it's the spine.

### M1 — The brick set: curated components + tokens *(parallel once M0 conventions land)*
**Realizes:** `component-library`, `design-theming` (token contract + D12).
**Build:**
- `tokens`: the role contract (`bg`/`surface`/`text`/`muted`/`primary`/`on-primary`/`border`/
  `accent` + ramps); the `@mode` dark-mode extension (D12) in `parseTokens` + `toCssVariables`.
- `components`: grow from 16 primitives → the ~20 primitives + ~13 page-role sections, each
  with a valibot props schema (D9), token-only styling, island-only-if-interactive, seed content.
**Demo:** the section-library palette renders real thumbnails through the one renderer; a
component's panel is fully derived; flipping a token restyles live; dark mode toggles.

### M2 — The authoring shell *(critical path; the daily product)*
**Realizes:** `authoring-shell`.
**Build (`editor`):** assemble the primitives into the shell — canvas selection + inline text
edit + drag-reorder (one tree-transform model, uniform undo); the insert palette (slash menu
primary, `+` handles); the section-library browser; the inspector props panel (consumes M0/M1);
the L2 design fold.
**Demo:** build a page by inserting Hero + Features, edit headlines inline, reorder, change a
prop and a token. This is the core "it works" moment.

### M3 — The publish loop *(critical path; makes it real)*
**Realizes:** `publish-loop` (D13 conflict policy, D7).
**Build:** mostly UX over existing `session`/`github`/`build` — draft (session branch) vs live
(Pages), autosave commits ("all changes saved"), one-click publish → Action → Pages,
human-readable "what changed", rollback as forward-revert, conflict = ask-on-same-section (D13).
Plus the small **render-at-SHA preview runtime** (boots the one renderer against a public-API
tree; reviewer-scale).
**Demo:** publish a page to a real `*.github.io` URL; share a preview link; roll a publish back.

### M4 — Content & media management *(parallel with M3 once M2 exists)*
**Realizes:** `structure`, `media` (D11, D13).
**Build:**
- `editor`+`core`: page CRUD, slug/route management, nav editor, globals (header/footer),
  collections UI (entry forms reuse M0's mapper).
- media: client-side resize-before-commit → content-hash `assets/`, media library, alt text,
  embed-by-URL, SVG sanitize via DOMPurify (D13).
**Demo:** a multipage site with navigation, images, and a collection — managed entirely in-browser.

### M5 — Onboarding + distribution + settings *(critical path tail; lands real users)*
**Realizes:** `onboarding` (D10), `seo-and-search`, `settings`.
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
