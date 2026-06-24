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
6. ✅ **Editor shell loop — `mountEditor` (`shell.tsx`).** Lays out a canvas region beside a
   side panel, keeps one live `MdxDocument` (`parseMdx` once), mounts `mountCanvas`, and on
   select resolves the meaningful node (`selectableNode` — nearest JSX component or block,
   `selectable.ts`), looks up its **injected** schema by component name, and renders
   `PropsPanel`. A panel edit mutates the node in place; the shell re-serializes, calls
   `canvas.update(mdx)`, re-highlights by **index-path** (`indexPathOf`/`nodeAtIndexPath`,
   offset-stable across edits — raw offsets shift), and fires `onChange(mdx)`. Schemas are
   injected, not discovered live (`discoverControls` parses TS source via the compiler — a
   Node step, impractical in-browser). Canvas gained a structural **selection overlay**
   (`highlight(indexPath)`, non-interactive layer) and now `preventDefault`s clicks (an
   editing surface selects, never navigates). Full click→panel→edit→live-update→`onChange`
   loop unit-tested (happy-dom) and **browser-verified** in the starter.
7. ✅ **Tokens-as-bricks panel — `TokensPanel` (`tokens-panel.tsx`).** Edits design tokens as
   semantic, opinionated, human-labeled choices (brand color, fonts, spacing, radius) grouped
   by concept, never raw var names; an edit emits updated tokens + flat source + CSS-var
   block. Wired into `mountEditor` behind an optional `tokens` source: the shell rewrites one
   `<style>` live on each theme edit (no rebuild — invariant #3) and surfaces the flat text
   via `onTokensChange`. Added `formatTokens` to `@nocms/tokens` (the missing flat-text
   serializer, inverse of `parseTokens`, round-trip tested). Browser-verified live theming.
8. ✅ **Starter `?edit` mount + browser verification.** `?edit` lazily imports `src/edit.tsx`
   (separate entry) → `mountEditor` with the starter's content, registry, injected schemas,
   and tokens; the reader path and the prerender build (`scripts/build.ts`) are untouched.
   `@nocms/editor` is a **workspace devDep** of the starter (dev-only; not in the reader
   bundle, not vendored yet).

9. ✅ **In-place prose editing — `@nocms/prose` wired into the shell (post-merge).**
   Double-clicking a paragraph/heading (`isProseEditable`, `prose-edit.ts`) mounts a transient
   `mountProseEditor` view over the block's DOM, seeded with the block's mdast inline children;
   the widget's `onChange(nodes)` splices `block.children` live and fires the shell `onChange`.
   The canvas is **not** re-rendered mid-edit (that would tear the view out) — only on commit
   (a click outside the block, or Escape), which re-serializes, re-renders via the one renderer,
   and re-selects the block by index-path. The canvas's new `suppressWhen` guard hands clicks
   inside the live editor to ProseMirror untouched (no `preventDefault`, no reselect). The
   active view is exposed via `EditorHandle.proseView()` (the escape hatch for a future
   formatting toolbar). Full loop unit-tested (happy-dom) and **browser-verified** (double-click
   → type → Escape re-renders the edited text through the one renderer).

**Open seams for the merge (this lane):**
- *Prose: block-level structure.* The widget edits one block's *inline* content; creating /
  splitting / merging / deleting blocks (Enter at a paragraph end, Backspace-merge) and
  editing list items or blockquote bodies are not wired yet — `isProseEditable` is paragraph
  + heading only. A block-structure layer over mdast is the next prose increment.
- *Schema production.* Schemas are injected; the starter's are **hand-authored** in
  `edit.tsx`. The real source is `discoverControls` over component TS at build/vendor time,
  shipped as a `Record<name, ComponentSchema>` — unbuilt, out of scope this lane.
- *Fork-vendoring the editor.* `@nocms/editor` isn't in the vendor `PACKAGES`, so `?edit`
  works only in the monorepo. Vendoring it (browser target; it pulls the MDX compiler — heavy,
  loads only in edit mode) so a fork is self-contained is the D1 follow-up.
- *Editor content source.* `edit.tsx` **inlines** the MDX as text because the build lane's
  `@mdx-js/rollup` plugin (enforce:pre, in the off-limits `vite.config.ts`) compiles every
  `.mdx` request — `?raw` included — so a raw-text import is impossible without touching it.
  The real editor loads content as text from the **GitHub API** (the repo is the database),
  so this is a dev-harness shim, not the intended path.
- *Dev-flow wrinkle (D1).* `predev` regenerates `vendor/*`, but bun's `file:` store keeps the
  copy from the last `bun install`, so a new vendored export (e.g. `formatTokens`) needs a
  `bun install` to surface in Vite dev. Harmless for forks (bundles are committed,
  never regenerated); a monorepo-dev paper cut worth smoothing later.

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
- **i18n declaration → RESOLVED: locale directory (`content/<locale>/…`), default locale at the
  content root.** Content declares a translation by *where the file lives*: the default locale
  (the first entry in `locales`) is authored at the root (`content/about.mdx` → `/about`); every
  other locale lives under its own directory (`content/fr/about.mdx` → `/fr/about`). Two files are
  translations of each other when their locale-stripped path matches. Three forks were weighed
  against the shared route mapping (invariant #5: text, line-mergeable) and editor-authorability:
  - *Filename locale suffix* (`about.fr.mdx`): `contentPathToRoute` is shared, unchanged, across
    all three tiers — it would map `about.fr.mdx` to `/about.fr`, an ugly route, unless locale
    special-casing were pushed *into* core's mapping (forbidden here, and it would couple every
    tier to a locale convention). Locale buried in a filename is also the least scannable.
  - *Frontmatter `lang` + shared `translationKey`*: decouples locale from route (flexible) but
    introduces a hidden, typo-prone shared-key invariant (a mistyped key silently unlinks a
    translation) and requires parsing frontmatter just to learn a file's locale/group. Kept as the
    escape hatch if non-parallel locale structures are ever needed.
  - **Locale directory** wins because the locale is *structural* — the first path segment — so the
    route falls out of core's existing `contentPathToRoute` with **zero core changes** and yields
    the clean, real, prefix-based URLs (`/fr/about`) the rest of the site already serves. The
    translation key is the canonical default-locale route (`contentPathToRoute` of the
    locale-stripped path), so grouping reuses the one shared mapping instead of inventing a second.
    Limitation (documented): the default locale must be authored at the root, not under
    `content/<defaultLocale>/`.
  - `i18nJob` (`i18n.ts`) is a no-op unless `locales` has ≥2 entries (a default + ≥1 translation).
    It emits per-locale bundles `i18n/<locale>.json` (`{ locale, entries: [{ key, route, path,
    data }] }` — the locale's content index, sorted by key) and a `i18n/translations.json`
    (`{ defaultLocale, locales, groups: [{ key, translations: { <locale>: <route> } }] }`, groups
    sorted by key) so the runtime can render a language switcher from a page's other-locale URLs.
    Pure; missing translations simply omit that locale from the group.
- **Feed shape → RESOLVED: JSON Feed 1.1, single format (hand-emitted, no dependency).** A feed is
  a small, stable spec, so it is hand-emitted per the project dependency bar. Three forks:
  - *RSS 2.0* is the most widely consumed but the loosest spec, and its RFC-822 dates need
    locale-independent English month/day names — bug-prone to hand-roll correctly.
  - *Atom 1.0* is the strictest/most-correct (RFC-3339 dates, required stable `id`/`updated`) but
    the most verbose, and still carries XML-escaping pitfalls.
  - **JSON Feed 1.1** wins on two project-specific axes: (1) the ②→① handoff — the runtime reads
    it with plain `fetch`+`JSON.parse` (no XML parser), so the same file doubles as a syndication
    feed *and* the data source for an in-site "latest" island; (2) hand-emission correctness —
    `JSON.stringify` eliminates the entire class of XML-escaping and RFC-822 date bugs, and dates
    are ISO-8601/RFC-3339, which we already produce. RSS/Atom XML syndication is the documented
    escalation path (a second builder behind the same conditional-job seam), mirroring how Search
    documented sharding rather than over-building v1.
  - `feedJob` (`feed.ts`) is a no-op unless both `siteUrl` and a `feed` config (`{ collections,
    title, description? }`) are present. Item URLs are absolute via `contentPathToRoute` + `siteUrl`
    (identical to the sitemap, so feed and site agree). Field conventions (all tolerant of missing
    values): `title` ← `data.title` (else filename-derived); `date_published` ← `data.date` then
    `data.published`, parsed to RFC-3339 (unparseable/absent → omitted); `summary` ← `data.summary`
    then `data.description`; `content_text` ← `plainText(body)` (no MDX compiler in ② — tier
    discipline); item `id` is the absolute URL. Deterministic order: date desc, then dateless items
    by URL asc, for clean committed output.

### D4 — Sandbox engine
Plugin isolation: iframe + QuickJS-in-WASM vs iframe-only for v1 (§17 of the
original vision). Affects `@nocms/sandbox`.

### D5 — URL / routing model

**Path↔route mapping → RESOLVED, and it lives in `@nocms/core` (`route.ts`).** Build (③),
derive (②), and the client runtime (①) all need the same convention, so per the invariant
"if two packages need the same thing it belongs in core" the canonical mapping is in core,
not duplicated. `contentPathToRoute` (full `content/...` path or content-relative),
`routeToContentPath` (inverse → canonical `index.mdx` form, since the forward map is
many-to-one), `normalizeRoutePath`, and `href(routePath, base)` (joins a deployment base).
Convention unchanged from the build's original: strip `.mdx?`, collapse a trailing `index`
segment, root with `/` (`content/index.mdx → /`, `content/posts/a.mdx → /posts/a`,
`content/posts/index.mdx → /posts`). FOLLOW-UP: migrate `@nocms/build`'s own
`contentPathToRoute` to consume core's (left untouched this lane to avoid colliding with the
parallel build work).

**Navigation model → RESOLVED: static multi-page is the default; an optional, dependency-free
History-API soft-navigation enhancement is provided; no client-router framework is adopted.**

- *The fork.* Static multi-page (every `<a href>` is a real page load against prerendered
  HTML — zero routing JS) vs. a client router that swaps views via the History API (soft
  navigation, preserved JS state, no flash).
- *Decision.* **Static multi-page is the foundation.** The build already prerenders every
  route to view-source-able static HTML (D6), GitHub Pages serves it, and a content site that
  navigates with zero routing JS is the most robust and most decentralized option (invariant
  #2: nothing the project runs can break a site; a site with no router can't have a broken
  router). Soft navigation is a **progressive enhancement**, not the base layer.
- *The enhancement.* `@nocms/router`'s `startNavigation(table, { base })` — a ~80-line
  History-API interceptor over the route table: it catches same-origin, unmodified, non-target
  /-download left-clicks whose pathname matches a known route, `pushState`s instead of
  reloading, mirrors back/forward via `popstate`, and exposes the current route via
  `current()` + `subscribe()`. Same-origin clicks to *unmatched* paths (assets, unknown pages)
  fall through to a normal page load. It is framework-agnostic (emits route changes; the host
  renders) and its DOM/History access is injected (`options.window`) so the table logic that
  drives it unit-tests under happy-dom. **Off by default** — a site opts in by calling it.
- *Why build it, not adopt preact-iso / wouter.* Both are JSX-component-route routers
  (`<Router><Route path=… component=…/></Router>`): they own a component-per-route model and
  (preact-iso) async lazy-loading + suspense hydration. noCMS's model is content-file-based
  over the *one* mdast renderer — there is no component-per-route tree to express, so a
  framework router would impose a second routing model and a hard Preact-router dependency for
  a need that is, here, just "intercept a click and tell me the matched route." That fails the
  project's "prefer stdlib, justify any dep" bar (the same bar that admitted MiniSearch only
  after hand-rolling search proved disproportionate — here the inverse holds: the in-house
  interceptor is tiny and the dep buys nothing). Rejected: **preact-iso** (couples routing to a
  JSX `<Router>` + lazy/suspense model we don't use; Preact-locked), **wouter** (~2.2kB, same
  JSX-route model), and **React Router** (heavy, wrong framework).

**Sub-decisions (recorded; the decision-free core is built around them):**

- *Dynamic params.* The matcher supports `:param` segments (e.g. `/posts/:slug`, multi-param,
  percent-decoded, static-beats-param specificity), but the **content-derived table is purely
  static** — every content file is its own route, so file-based content needs no param routes.
  `:param` support exists so derive/② or build/③ can *emit* param/collection/pagination routes
  later without a matcher redesign. **DEFERRED:** who generates collection/pagination routes
  (e.g. `/posts/page/:n`) and how — a derive/build concern, not the router model.
- *i18n locale prefixes.* **DEFERRED.** Two viable shapes when needed: a `:lang` leading param
  in the table, or treating the locale like a second `base` segment. Not built — no consumer
  yet; flagged so it isn't designed away (the matcher + base-stripping already accommodate
  either).
- *Page shell / layout* (overlaps D6). **DEFERRED to the integrator** — where the page chrome
  lives (content-tier layout vs. an emitted shell) is unsettled and tied to island hydration,
  owned by the parallel build/renderer lane. The router provides the matched route + payload;
  it does not own layout.

**Integration seam (for the merge — `@nocms/router` is not wired into anything yet):**
- `@nocms/build` (③): build its route list with `routeTableFromEntries`/`contentPathToRoute`
  from core (and migrate its local `contentPathToRoute` to core's — the noted follow-up).
- `templates/starter` (①): emit normal `<a href={href(route, base)}>` links (works with zero
  JS); optionally, in a hydrated entry, call `startNavigation(table, { base })` and re-render
  the matched route on `subscribe` for soft navigation. Starter wiring is the integrator's
  follow-up (the parallel lane owns the starter).
- `@nocms/derive` (②): reuse `contentPathToRoute` for route-keyed manifests/feeds/search so
  every tier agrees on one URL for a given content file.

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

**Island hydration / client JS — RESOLVED (the interactivity layer over the static path).**
Curated components prerender static; an interactive subset hydrates in the browser, reusing
the one renderer's component model (Preact `hydrate` over the same components — never a second
renderer or component registry). The contract:

- *How an island boundary is declared → the registry `island: true` flag (per-component).* A
  component is interactive because of what it *is*, declared once on its `@nocms/components`
  registry entry (`{ component, island?: boolean }`) — not per usage. **Rejected: per-usage MDX
  annotation** (Astro-style `<Counter client:load/>`). Per-usage would scatter the decision
  across every call site and add an annotation DSL, against the project's component-defined
  philosophy (props-discovery already derives behavior from the component, not from
  annotations). Trade-off accepted: every instance of an island hydrates; per-instance opt-out
  (e.g. a static `<Counter/>` in a context that never interacts) is a future escape hatch, not
  v1. A thin per-usage override could layer on later without changing the marker/hydration
  format.
- *Marker + props format.* At prerender each island root is wrapped in a layout-neutral
  (`display:contents`) `<div data-island="<Name>" data-island-props="<json>">` around the real
  component's SSR output. Props serialization is **JSON in the `data-island-props` attribute**;
  only JSON-serializable props travel. `children` and non-serializable props (functions, VNodes)
  are dropped — children are reconstructed from the marker's SSR HTML at hydration. **v1 limit:**
  islands that need their children (slotted content) re-rendered client-side aren't supported
  yet (the proof island, `Counter`, is configured purely by serializable props); richer
  slot-preserving hydration is a follow-up. Detection/serialization/wrapping live in
  `@nocms/renderer` (`islands.ts`) and are pure (no DOM, no MDX) so they test without a browser;
  `hydrateIslands` is the only DOM-touching seam.
- *Manifest.* `collectIslands(tree, identify)` is the pure VNode-tree walk (names + per-instance
  props) for a consumer holding a resolved tree (the editor). The **prerender path can't walk**
  the tree (an MDX document renders lazily — there's no resolved tree before output), so the
  per-page manifest is read back from the emitted markers (`islandNamesFromHtml`). Both compute
  the same island-name set from the two representations a caller actually has (tree vs HTML).
- *Partial, not full, hydration.* Only island sub-trees ship interactivity; island-free pages
  emit **zero** client JS and stay byte-identical to the static-only output. (Decided against
  whole-page hydration: it would force all content through client JS and defeat the
  view-source-able static guarantee.)
- *Client-JS bundling strategy → bundle once at vendor time (D1), serve a committed artifact.*
  The island client entry (`@nocms/build`'s `island-client.ts`: import the registry +
  `hydrateIslands`, run on load) is bundled to a self-contained browser ESM file at *vendor*
  time in the monorepo — `Bun.build`, `target: browser`, preact **inlined** (Pages serves static
  files, no resolver), tree-shaking the MDX compiler out — and **committed** alongside the
  vendored `@nocms/build` bundle. `buildSite` copies it to `dist/_nocms/islands.js` and injects
  `<script type="module">` only into pages with islands. This keeps the publish path one
  toolchain (the Bun-based render-and-emit loop, no Vite SSG) and self-contained for forks (the
  fork serves the committed bundle, never rebuilds it). **Rejected: bundling at site-build time**
  (re-introduces a per-build bundler step and, in a fork resolving `@nocms/renderer` to the
  node-target vendored bundle, would risk shipping the MDX compiler to readers).
  `nocmsVitePlugins()` exposes the same client entry as a Vite virtual module so the dev server
  and the publish bundle share one island entry.
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
