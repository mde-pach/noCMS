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
4. ⏭ **NEXT — canvas mount.** Mount `renderEditableToVNode` output in an iframe/shadow
   sandbox; on click, read `data-mdx-pos` from the target (or nearest annotated ancestor),
   run `nodeAtOffset`, draw a selection overlay, expose the selected node to the editor
   shell. Then: props panel, the ProseMirror-over-mdast prose widget (D2a), insert/DnD,
   tokens panel.

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

### D4 — Sandbox engine
Plugin isolation: iframe + QuickJS-in-WASM vs iframe-only for v1 (§17 of the
original vision). Affects `@nocms/sandbox`.

### D5 — URL / routing model
How content paths map to routes; client router choice (lightest viable).

### D6 — Build SSG shape
`@nocms/build` prerender approach: multi-route prerender + island hydration via
`@preact/preset-vite` prerender vs a custom render loop over the renderer. Partly
straightforward, but the island/hydration boundary is a real design choice.

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

Currently vendored: `@nocms/tokens`, `@nocms/components` (what the starter consumes at
runtime). As the editor mounts (D2) and SSG/islands land (D6), add their packages to
`PACKAGES` in the vendor script. Known follow-up: the bundle imports
`preact/jsx-dev-runtime` (Bun's default) rather than the production runtime — correct
but slightly heavier; switch when a production-JSX build path is wired.
