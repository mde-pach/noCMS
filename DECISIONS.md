# Open decisions

Big forks deferred until decided with the project owner. Straightforward
implementation proceeds around these; nothing here is settled. When one is
resolved, record the choice + rationale and move it to the "Resolved" section.

## Open

### D2 — Editor engine architecture
WYSIWYG over MDX with lossless round-trip. Reference studied (engine approach only,
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
- D2a — rich-text prose editing widget: ProseMirror/TipTap scoped to a block and
  serialized to markdown, vs CodeMirror source+preview, vs contentEditable mapped
  to mdast. (Editor-only bundle, never shipped to readers — bundle weight matters
  but only for the owner.)
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
