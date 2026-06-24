# Open decisions

Big forks deferred until decided with the project owner. Straightforward
implementation proceeds around these; nothing here is settled. When one is
resolved, record the choice + rationale and move it to the "Resolved" section.

## Open

### D2 — Editor engine architecture

**Product vision (Maxime, the north star).** A flexible, versatile website builder that
*feels Figma-like* but targets **non-developers/non-designers**: assemble sites from
pre-built **layouts + components**, with an **opinionated** way of building (e.g. design
**tokens-as-bricks**), every concept understandable with **zero web/design knowledge** —
"standard-user-proof." The cat-next TipTap editor below was a reference for the
**props-discovery philosophy only**, not an editor recommendation.

**Key finding from library research (2026-06): no full builder is adoptable.** Every
component-based visual builder is disqualified for noCMS by a locked JSON-tree data model
(Puck, Craft.js, Plasmic, Builder), a centralized/hosted editor that breaks decentralization
(Builder, Plasmic), or dormancy (Craft.js) — all against noCMS's MDX-text-source / Preact /
decentralized constraints. So the editor is **bespoke composition of packages noCMS already
has**, on top of a few small primitives. The big builders are **UX/architecture references
only**.

**Feature map (capability → what powers it):**
1. *Canvas* — the live site is the editing surface → `@nocms/renderer` (invariant #1) +
   DOM↔mdast mapping via source positions + iframe/shadow sandbox (kills the
   React-context-barrier pitfall).
2. *Insert bricks* — components + pre-built **layout sections** by drag-drop → a DnD
   primitive + a curated layout-brick library (MDX snippets + metadata) + AST insert.
3. *Configure* — friendly property controls → `@nocms/props-discovery` + a control-widget
   set (prop-type → widget); never expose JSON.
4. *Edit text in place* — see D2a.
5. *Design: tokens-as-bricks* — semantic, opinionated token panel + presets → `@nocms/
   tokens` (runtime CSS vars, no rebuild — invariant #3) + a color picker.
6. *Structure* — pages, nav, a layers/outline tree from mdast → `@nocms/core` + routing (D5).
7. *Media* — image upload/picker + alt text → `@nocms/github` + build-tier optimization (D6).
8. *History* — one unified undo/redo over mdast/text (avoid cat-next's per-region isolation).
9. *Save & publish* — branch-per-session + async publish → `@nocms/github`, `@nocms/auth`.
10. *Guardrails* (cross-cutting) — valibot validation + constrained choices → `@nocms/core`.
11. *Plugins* (later) — sandboxed extra bricks/controls → `@nocms/sandbox` (D4).

**The only genuine "adopt a dependency" slots (Preact-feasible primitives):**
- *Canvas drag-and-drop:* **Pragmatic DnD** (`@atlaskit/pragmatic-drag-and-drop`, ~4.7kB
  vanilla, framework-agnostic — top pick) or **dnd-kit/dom** (richer, pre-1.0).
- *Prose text widget:* **ProseMirror core** (vanilla, no framework lock) — see D2a.
- *Small UI:* a color picker; minimal popover/menu primitives (build or vet).

**References to study (do NOT adopt):** **TinaCMS** — the blueprint: edits MDX as an AST in
git, never as a string, self-hosted; **Onlook** — DOM element ↔ source-location mapping for
in-site editing; **Puck** — cleanest field-config + DropZone WYSIWYG UX; **GrapesJS** —
builder panel/trait UX.

**Editor build status (resume here):**
1. ✅ Document seam — `parseMdx`/`serializeMdx` (D2b verified).
2. ✅ Selection mapping core — `position.ts` (`nodeAtOffset`/`deepestNodeAtOffset`/
   `nearestOfType`): a click's source offset → the mdast node path. Pure + tested.
3. ✅ Renderer editor-mode DOM annotation — `@nocms/renderer`'s `renderEditableToVNode`
   (`editable.ts`). Evaluates with `{ development: true }` + a wrapped `jsxDEV`; intrinsics
   get `data-mdx-pos` injected into props, components (which don't forward unknown props)
   are wrapped in a `display:contents` carrier; `line:col → start offset` so the DOM offset
   feeds `nodeAtOffset` directly. Publish path stays clean (tested). Known edge: wrapping a
   component that renders e.g. an `<li>` — `display:contents` keeps layout but not
   HTML-nesting validity; acceptable for v1, revisit if it bites.
4. ✅ Canvas mount — `@nocms/editor`'s `mountCanvas` (`canvas.ts`): renders the annotated
   editable tree into a target and reports the selected mdast node path on click
   (`offsetFromElement`/`selectionAtElement` resolve via `nodeAtOffset`). happy-dom is the
   editor's DOM test env (per-file `@vitest-environment` docblock). Remaining canvas
   refinements: iframe/shadow sandbox for style + React-context isolation, a visual
   selection overlay, and a "selectable granularity" policy (nearest block/component) in
   the editor shell — clicking a block resolves to its first inline child today; the shell
   chooses the meaningful node via the path.
5. ✅ Props panel — `@nocms/editor`'s `jsx-attributes.ts` (pure `getProp`/`setProp`/
   `removeProp` over the JSX node) + `PropsPanel` (`props-panel.tsx`): a friendly control
   per `@nocms/props-discovery` Control, bound to the selected node's attributes; edits
   mutate the node in place and fire `onChange` for the shell to re-serialize + re-render.
   happy-dom tested. Remaining: media control = plain text field (real media picker later);
   the editor shell that wires canvas selection → schema lookup → panel → re-render loop.
6. ⏭ **NEXT — the editor shell loop.** Wire `mountCanvas` selection → discover/cache the
   selected component's schema → render `PropsPanel` → on change `serializeMdx` + re-mount
   the canvas. Then the ProseMirror-over-mdast prose widget (D2a), insert/DnD, tokens panel.

---

WYSIWYG over MDX with lossless round-trip. Reference studied (props-philosophy only,
a POC): cat-next TipTap editor at
`/Users/maximedepachtere/project/papernest/cat-next/apps/front/features/editor`.

**What the cat-next engine does well (worth adopting):**
- *Descriptor-driven, zero-config.* Component authors write ordinary typed
  components; editability is inferred from the TS prop types — no annotation DSL.
  noCMS already has this as `@nocms/props-discovery`, and better: at runtime via
  the TS compiler API, so there is no build-time descriptor generation step.
- *Render the real component as the canvas.* The node view renders the actual
  component for instant WYSIWYG preview. noCMS already has the matching piece —
  `@nocms/renderer.renderToVNode` is the one renderer and is meant to be the canvas.
- *Three edit surfaces:* a props panel (from the descriptor), click-to-edit on
  rendered text, a native content slot for children, and nested editors for
  rich-text props. Good UX to mirror.

**Where noCMS must diverge (hard constraint):**
- cat-next's source of truth is **ProseMirror/TipTap JSON** (a tree AST). That
  violates noCMS invariant #5 — layout/content is **MDX text, line-mergeable, no
  JSON tree**. So we cannot persist ProseMirror JSON.

**Proposed model — MDX-AST as the document, MDX text as the artifact:**
- Parse MDX → mdast (remark + `mdast-util-mdx`) as the in-memory model; persist by
  serializing back to MDX text (`mdast-util-to-markdown` + mdx). Text is the source
  of truth, so round-trip is structural, not a lossy re-derivation.
- Preview by feeding the same MDX/AST to `@nocms/renderer` (reuse the one renderer —
  satisfies the preview===publish guarantee for free).
- Map visual selection → AST via remark **source positions** (`node.position`),
  NOT by stringifying values and DOM-searching (the POC's fragile click-to-edit).
- Edit component props with `@nocms/props-discovery` controls, mutating the JSX
  node's attributes in the AST, then re-serialize. Single undo over the AST/text
  (avoid the POC's per-region isolated undo).

**Pitfalls flagged in the POC to design around:** DOM value-search binding (use
positions), isolated rich-text undo (unify), React-context barrier across node
views (each preview island is its own root — keep components context-light or
provide context at the canvas root), heuristic async-render timing.

**Sub-decisions still open:**
- D2a — prose editing widget. **DECIDED: ProseMirror core as a transient view over mdast,
  with CodeMirror as a scaffold/code-view (option B-with-A-scaffold).** A prose paragraph
  parses to mdast inline nodes that interleave standard marks
  (`strong`/`emphasis`/`inlineCode`/`link`/`text`) with **MDX inline atoms** —
  `mdxJsxTextElement` (inline `<Badge/>`) and `mdxTextExpression` (`{expr}`). Preserving
  those atoms while editing is the whole problem. The widget sits behind a small region-edit
  seam (block source range in, edited MDX text out), so the two parts compose.

  No WYSIWYG framework treats mdast as the source of truth — every one (ProseMirror, Lexical,
  Slate) owns its own JSON model and *drops inline constructs it has no explicit handler
  for*; generic converters (`prosemirror-markdown`, `@lexical/markdown`) confirm the
  data-loss trap. So a mdast-authoritative editor must be **built, not adopted**, on
  **ProseMirror core directly** (vanilla, no UI-framework lock, no third-party editor
  framework in the dependency path). We do not use TipTap (a wrapper over the same engine).

  - **(A) CodeMirror 6 source + live preview — scaffold / power-user code view.** Edits the
    MDX text, so the verified `mdx-document` round-trip stays authoritative and inline atoms
    are literally just text (lossless by construction). It shows raw markup, so it is *not*
    the non-dev surface — it's the low-risk scaffold to stand up the editor loop, and stays
    as an optional code view. (MDX-aware highlighting is DIY; CommonMark/GFM is turn-key.)
  - **(B) ProseMirror core as a transient edit view over mdast — the non-dev WYSIWYG
    surface.** Build the PM doc *from* a prose span's mdast and serialize *back* to mdast on
    commit, so mdast stays the truth (inverting Milkdown's PM-as-truth default). Because we
    own the schema, `mdxJsxTextElement` / `mdxTextExpression` are modeled as inline **atom**
    nodes and survive deterministically. This delivers the Figma-like "click and type like a
    doc" feel *and* preserves inline atoms. The bidirectional mdast↔PM-schema transformer
    for prose spans is the entire risk — prototype + round-trip-test it the way D2b proved
    the mdast↔MDX round-trip. References to mine (not depend on): Milkdown's
    `$node`/`parseMarkdown`/`toMarkdown` transformer design and MDXEditor's inline-vs-flow
    `jsxComponentDescriptor` split.

  **Build status (`@nocms/prose`) — IMPLEMENTED (option B, the ProseMirror widget).** A new
  standalone package operates purely on mdast inline nodes (`PhrasingContent[]` in/out), so it
  depends only on mdast types + ProseMirror core — no dependency on `@nocms/editor` (clean
  boundary). Pieces:
  - `proseSchema` — a PM schema for a prose span: `doc` (inline content) + `text`, marks
    `link`/`em`/`strong`/`code`, and inline **atom** nodes `mdxJsxText` / `mdxExpression` (each
    carries its source mdast node verbatim in an attr, rendered as a non-editable chip). Mark
    declaration order *is* the canonical serialization nesting (link ⊃ emphasis ⊃ strong),
    matching remark.
  - `mdastInlineToDoc` / `docToMdastInline` — the pure bidirectional transformer. **Lossless
    round-trip verified** over 15 fixtures (text, nested marks, links ±title, inline code as a
    leaf-shaping mark, breaks, JSX/expression atoms incl. `data.estree`, a dense mixture).
  - `mountProseEditor(target, { nodes, onChange })` → `{ view, destroy() }` — transient PM
    view with span-scoped history + a mod-b/i/\` mark keymap; emits updated mdast on every
    doc-changing transaction. happy-dom tested via applied transactions.

  **Preservation decisions / caveats (the host should know):**
  - *Mark nesting is normalized.* PM marks are an unordered set, so the relative nesting of
    strong/emphasis/link is canonicalized to schema order on serialize. Matches remark for the
    common case; inverse-authored nesting (`**_x_**`) round-trips to the canonical form —
    semantically identical, structurally normalized. Inherent to mark-based editing; accepted.
  - *Nothing is dropped.* Any inline mdast type we don't model explicitly (inline `image`, raw
    `html`, …) is preserved verbatim as an opaque `unknownInline` atom rather than discarded.
  - *Inline JSX atoms are opaque in v1* — an `mdxJsxTextElement`'s children round-trip exactly
    but aren't separately editable yet (the element is one chip). Revisit if in-atom editing
    is wanted.
  - *Host seam:* the editor shell extracts a block's `children`, calls `mountProseEditor`, and
    splices `onChange`'s `PhrasingContent[]` back into the document before re-serializing.
- D2b — **VERIFIED.** Toolchain: `unified` + `remark-parse` + `remark-frontmatter`
  + `remark-mdx` + `remark-stringify`, one processor for both directions
  (`@nocms/editor`'s `parseMdx`/`serializeMdx`, see `mdx-document.ts`). A
  parse→serialize→parse cycle is **structurally lossless** on JSX flow/inline
  elements, all attribute kinds (string, `={expr}`, boolean shorthand, `{...spread}`),
  flow/text expressions, comments, and frontmatter, and serialization is a stable
  fixpoint (`mdx-document.test.ts`, 14 cases). The *only* change is cosmetic
  formatting normalization (e.g. list bullet `-`→`*`) — which is D2c's problem, not
  a losslessness failure. Conclusion: persisting MDX text (not ProseMirror JSON) is
  sound; the riskiest assumption holds.
- D2c — how AST mutations re-serialize while preserving unrelated formatting
  (minimize diff noise so git line-merges stay clean).

**Recommendation:** adopt the descriptor-driven + render-the-real-component
philosophy; invert the data model to MDX-text/AST; reuse `@nocms/renderer` and
`@nocms/props-discovery`; map via source positions. Prototype D2b (lossless
round-trip) first — it is the riskiest assumption.

### D3 — Derive ② toolbox (per feature)
Search index (e.g. Pagefind vs custom sharded index), i18n bundle format, manifest
/feed shapes. Decide per feature; each may differ.

- **Search → RESOLVED: MiniSearch (corpus-based engine), not Pagefind, not hand-rolled.** Two
  forks were evaluated against the seam + the project values:
  - *Pagefind* (and other HTML-crawlers / WASM sharded indexes like tinysearch) crawls *built
    HTML*, so it can't consume `@nocms/derive`'s input (`CollectionEntry[]`) without inverting
    the tier order — it would belong in ③, after the build, and brings WASM + no fuzzy. Its
    sharded lazy-load wins only at large corpora; documented as the escalation path, not v1.
  - *Hand-rolling* an inverted index (the first cut) gave zero ranking/fuzzy/prefix and would
    mean owning the hard parts of search forever — exactly the reinvention the project avoids.
  - **MiniSearch** (MIT, zero runtime deps, framework-agnostic) indexes the JSON corpus
    directly and its serialize/load split maps onto the tiers: the ② Action builds the index
    and `JSON.stringify`s it to one `search.json`; the ① runtime loads it with
    `MiniSearch.loadJSONAsync(json, SEARCH_OPTIONS)` and queries with real BM25 ranking +
    fuzzy + prefix. Rejected FlexSearch/Fuse (Apache-2.0; project leans MIT) and Lunr
    (bulky index, unmaintained). Good to ~50k docs — past that, escalate to sharding.
  - `searchJob` (`search.ts`): `plainText` reduces an MDX body to searchable text by
    lightweight regex (no MDX compiler in the batch tier — search tolerates lossy text);
    MiniSearch owns tokenization/ranking. Build and runtime share `SEARCH_OPTIONS`
    (`fields: [title, text]`, `storeFields: [collection, path, title, excerpt]`). Wired into
    `deriveAll`. The one dependency added is justified: search relevance is hard, MiniSearch is
    tiny + MIT + zero-dep, and reimplementing it well is disproportionate.
- *i18n bundle format* and *feed shapes* remain open (see `i18nJob`, still a stub).

### D4 — Sandbox engine
Plugin isolation: iframe + QuickJS-in-WASM vs iframe-only for v1 (§17 of the
original vision). Affects `@nocms/sandbox`.

### D5 — URL / routing model
How content paths map to routes; client router choice (lightest viable).

### D6 — Build SSG shape

**Static prerender path: DONE (custom render loop over the one renderer, no Vite SSG).**
`buildSite` (`@nocms/build`) loads `content/**/*.mdx` → routes, parses `theme.tokens` → CSS
vars, builds the component map from `@nocms/components`, prerenders each route via
`prerenderRoutes` → `renderToHtml` (the same renderer the editor previews with, so invariant
#1 holds), and emits clean-URL static HTML (`/` → `index.html`, `/x` → `x/index.html`) with
token CSS inlined in `<head>` and `public/` copied, respecting `base` for project Pages. The
starter's `build` script runs it (`scripts/build.ts`); `bun run build` yields a
view-source-able static `dist/` (real markup, no SPA shell). Chose a render-and-emit loop
over `@preact/preset-vite`'s prerender: the renderer already produces the exact tree, so Vite
SSG would add a second toolchain for no gain on the static path. `@nocms/build` +
`@nocms/renderer` are vendored (node target — they pull the MDX compiler, fine for the CI
build bundle) into the starter so a fork builds with no monorepo (D1) — verified against a
monorepo-less copy.

**Still open (the real design choices):**
- *Island hydration / client JS.* Curated components are static today, so a prerender-only
  site is fully correct and testable. Interactive islands — and the client-JS bundling +
  `nocmsVitePlugins` they imply — are unbuilt; this is where the Vite tier likely returns.
- *Page shell / layout.* The prerender emits only the content tree. The starter's dev runtime
  (`src/main.tsx`) wraps content in an `App` shell (centered container, body font/color); the
  static output does not, so dev and publish diverge on chrome. Where layout lives (a
  content-tier layout vs. an emitted shell) is unsettled — likely tied to D5. Flagged, not
  guessed.
- *Multi-page routing.* `buildSite` maps `index.mdx`→`/`, `x.mdx`→`/x`, `x/index.mdx`→`/x` —
  enough for the one-page starter. Params, collections, and pagination are D5.

## Resolved

### D1 — Package distribution model → **vendor a built bundle**
A fork of `templates/starter` lives outside the monorepo and can't resolve
`workspace:*`. **Decision: vendor built `@nocms/*` bundles into the template.** Most
aligned with invariant #2 (fully decentralized — the fork is self-contained, nothing
the project runs can break a site, no external resolution at install or runtime).
Rejected: npm publish (adds a live dependency on external infra) and runtime-fetch
(reintroduces a hosted artifact the site depends on).

Mechanics (`templates/starter/scripts/vendor.ts`): each needed package is built into a
self-contained, installable `file:` package under `templates/starter/vendor/<pkg>/`
(`index.js` via `Bun.build`, browser ESM, `preact` external; `index.d.ts` tree via
`tsc --emitDeclarationOnly`; a small `package.json`). The starter depends on them via
`file:./vendor/<pkg>` — pure node resolution, no Vite alias or tsconfig paths, so the
in-repo starter is identical to a fork. The bundles are **committed** (a fork has no
monorepo to build from). `predev`/`prebuild` run the vendor script: in the monorepo it
regenerates (contributor package edits flow in on next run); in a fork the sources are
absent so it's a no-op and the committed bundles are authoritative.

Currently vendored: `@nocms/tokens`, `@nocms/components` (browser target — the reader
runtime), plus `@nocms/renderer`, `@nocms/build` (node target — the CI build tooling, which
pulls the MDX compiler). `vendor.ts` takes a per-package `target`. As the editor mounts (D2),
add its package to `PACKAGES`. Known follow-up: the bundle imports
`preact/jsx-dev-runtime` (Bun's default) rather than the production runtime — correct
but slightly heavier; switch when a production-JSX build path is wired.
