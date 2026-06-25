# noCMS — Product Vision & Feature Map

How noCMS becomes **feature-ready**: the complete feature surface, the principle that
organizes it, the hard product decisions that are now settled, and the phased build that
gets there. This is the *product* companion to `CLAUDE.md` (architecture invariants) and
`DECISIONS.md` (open forks). It is forward-looking and durable; it supersedes the
background in `noCMSVISION.md`.

> **Feature-ready** = a non-developer can go from *zero* to a *published, real website*
> without leaving the browser or seeing a config file — and **every stage of that journey
> has no dead end**. noCMS is a CMS, not a site-type template: the generality lives in the
> primitives; the audience fit comes from progressive disclosure, not from picking a niche.

## The spine: layered exposure

Every feature lives at an *altitude*. The same four artifacts — **MDX layout, flat tokens,
git history, content collections** — are exposed differently depending on who is looking.
This is what "the right layer to the right audience" means, and it is only possible because
of invariant #1 (one renderer) and #4 (the repo is the database).

| Layer | Audience | What they touch | Backed by |
|---|---|---|---|
| **L0 Content** | Anyone | Inline text, swap an image, fill a field | `editor` prose, `core` fields |
| **L1 Compose** | Creator | Add/reorder sections & components, set props | `editor` canvas, `props-discovery` |
| **L2 Design** | Brand owner | Tokens-as-bricks, themes, responsive | `tokens` |
| **L3 Structure** | Power user | Content types, collections, nav/IA, templates | `core`, `router` |
| **L4 Extend** | Developer | Raw MDX, custom components, plugins, git/PRs | `sandbox`, `github` |

A non-developer's text edit and a developer's git PR mutate **the same files**. You can
always drop down a layer; you are never forced up one. That is the whole thesis.

## Capability surface

The CMS organs already exist as libraries; the product surface (flows + curated content)
is the gap. Legend: **✅ engine exists · 🟡 partial · 🔴 product gap**. Tier per invariant #6.

| # | Domain | State | Notes |
|---|---|---|---|
| A | **Content modeling** | ✅ engine / 🔴 surface | `core` has `FieldDef`/`CollectionDef` + valibot. Gap: UI to define collections; global/singleton content (nav, footer, brand); references between entries. *(L3, ①)* |
| B | **Authoring** | 🟡 | `editor` has canvas/selection/prose/props-panel. Gap: insert palette, drag-reorder, undo/redo, slash menu — the *assembled* shell. *(L0–L1, ①)* |
| C | **Information architecture** | ✅ engine / 🔴 surface | `router` is solid. Gap: page CRUD, slug management, nav-menu editor. *(L3, ①)* |
| D | **Design & theming** | 🟡 | `tokens` + tokens-panel exist. Gap: theme presets, dark mode, responsive controls, and the **curated section/layout library** — the biggest product lever for the Figma-like feel. *(L2, ①)* |
| E | **Media** | 🔴 | See resolved decision below: image upload + resize is in; heavy media is embed-by-URL. *(① upload, ③ optimize)* |
| F | **Publishing workflow** | ✅ engine / 🔴 surface | `session` + `build` exist. Gap: the user-facing publish loop — draft/live, preview, diff, rollback. *(③)* |
| G | **Distribution / SEO** | ✅ engine / 🟡 surface | `derive` ships search, sitemap, i18n, feeds, manifests. Gap: per-page SEO/OG controls, search UI component. *(②)* |
| H | **Collaboration** | 🔴 | Mostly "expose what GitHub already gives": roles = repo permissions, review = PRs, comments = PR comments. Shaped by invariant #9 (everything public). *(①)* |
| I | **Forms & interactivity** | 🔴 | See resolved decision: visual primitives ship; submission backend is deferred to self-host. *(①)* |
| J | **Extensibility** | ✅ engine / 🔴 surface | `sandbox` + `core` capabilities are solid. Gap: install/discovery UX. *(①)* |
| K | **Onboarding & settings** | 🔴 | The make-or-break: create → first deploy → live editor. Auth is ✅; the zero-to-live journey is the weakest, highest-stakes gap. *(① + ③)* |

## Resolved hard decisions

Four problems are noCMS-specific — no competitor solves them under our constraints. All
four are now settled, and three of them *shrink* the build.

1. **Forms have no free backend → deferred to self-host.** The free path ships the visual
   `Form`/`Input` primitives so a form *composes and previews*, but submission is wired in
   only by a self-hosted deployment. No form-backend work in v1.

2. **Media lives under hard repo limits → repo serves images, links serve the rest.** Image
   upload with **resize-before-commit** stays (the one thing the repo can honestly serve);
   video and large files become an **embed-by-URL** component, never an upload. (Git LFS is
   not served by the Pages CDN; there is no large-media story on the free path.)

3. **Onboarding without a central service → education *is* the feature.** The wizard does
   not hide GitHub; it **explains it in plain language** ("GitHub is just where your site
   lives — a free filing cabinet") and teaches one brick per step. Decentralization becomes
   a teaching moment, not a UX liability. People who want to run their own site learn how it
   works by being walked through it once. This is a first-class, designed flow.

4. **Preview with no private staging + one Pages branch → render-at-SHA via the public API.**
   The editor already renders live in-browser (local preview is essentially free). A
   *shareable* preview needs **no auth and no second deployment**: because everything is
   public (invariant #9) and reads are client-side from `api.github.com` (invariant #7), a
   preview link carries `owner/repo@sha`; a small preview-runtime boots the **same renderer**
   (invariant #1) and fetches the content tree at that SHA. The session branch keeps the
   commit alive so GitHub will not garbage-collect it.
   *Honest caveat:* unauthenticated reads are rate-limited (~60/hr/IP) — fine for a few
   reviewers, which is what preview is for.

## The feature-ready roadmap

Phased so that each phase leaves the journey with one fewer dead end.

- **Phase 0 — Onboarding spine** *(make-or-break)*
  Guided, plain-language create→live wizard · auth UX · "what is this brick" teaching at
  each step · land in the live editor.

- **Phase 1 — Authoring shell** *(the daily surface)*
  Assembled editor: component **insert palette** · **drag-reorder** · inline text edit ·
  undo/redo · props panel wired to discovery · **+ the curated component & section library**
  (the biggest product lever — turns a blank canvas into something Figma-like).

- **Phase 2 — Structure**
  Page CRUD · slug/route management · **nav-menu editor** · global/singleton content
  (header, footer, brand).

- **Phase 3 — Design**
  Tokens panel + **theme presets** · dark mode · responsive controls — all runtime, no
  rebuild (invariant #3).

- **Phase 4 — Media-lite**
  Image upload + resize-before-commit · alt text · **embed-by-URL** component for video and
  large files.

- **Phase 5 — Publish loop**
  One-click publish · draft vs live · **in-place preview + shareable SHA preview** ·
  rollback (free via git history).

- **Phase 6 — SEO finish**
  Per-page meta/OG controls wired to `derive` · search UI component.

## Design workflow (how we go from idea → shippable UI)

UI/UX is explored visually and *landed* into the substrate through a fixed pipeline. The
discriminator that matters is **conformance to the system's contracts, not the choice of
tool** — any generator is acceptable as long as its output passes the bar at the landing
step.

1. **Explore — Claude Design.** Once a phase has a UX spec, prototype the
   judgment-heavy surfaces — the **editor chrome** (palette, canvas, panels), the
   **onboarding wizard**, and the **section-library look/feel** — as interactive,
   testable prototypes, in several directions at once. Import the noCMS token vocabulary
   (the flat tokens we already export as **DTCG**) so explorations are brand-consistent and
   on the L2 token model from the start, not ad-hoc colors reconciled later.

2. **Land — `/design-sync` into the repo.** Bring the chosen direction into the codebase,
   where it is made conformant: Preact components with typed props (so `props-discovery`
   derives the right controls), **token-only theming** (never hardcoded values), and the
   correct island-vs-static split so preview === prerender.

3. **Gate — the fixed conformance bar.** Whatever produced the artifact, it ships only if it
   passes: typecheck · `props-discovery` derives sane controls · token-only theming · a
   preview===prerender check. The generator can change; this acceptance test does not.

The split is a *pipeline*, not a lane choice: Claude Design explores and prototypes →
design-sync lands it → the conformance bar enforces correctness on the way in. Siloed visual
tools (e.g. Figma) remain useful for exploration but carry none of the repo's contracts, so
they feed step 1 only.

## Deferred (self-host or post-v1)

Form submission backends · collaboration UI (lean on raw GitHub) · plugin marketplace /
discovery · i18n authoring UI · scheduled publish · OG-image generation · custom-domain
helper. Each is a deliberate omission, not an oversight — most are either a self-host
concern or a thin layer over a GitHub primitive that can wait.
