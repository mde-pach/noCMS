# @nocms/editor

The in-site, per-site editor: WYSIWYG over MDX, visual layout composition, and live CSS-variable token theming. Ships with the site; never a hosted studio. Reuses the runtime renderer as the canvas. Heavy preview compilation (WASM) loads only here.

The public API is `src/index.ts` — depend on that, not internals. Architecture invariants and conventions live in the repo `CLAUDE.md`.

## Document model

MDX text is the source of truth (invariant #5). The editor's in-memory model is the
mdast tree of that text: `parseMdx(text)` → tree, edit the tree (e.g. mutate a JSX
node's attributes), `serializeMdx(tree)` → text to commit. One `unified` processor
(`remark-parse` + `remark-frontmatter` + `remark-mdx` + `remark-stringify`) drives
both directions, so the cycle is structurally lossless on JSX blocks, attributes, and
expressions — content is never re-derived from rendered output. See DECISIONS.md D2b.

Source positions are retained on parse so a visual selection can map back to the node
that produced it, rather than stringifying values and searching the DOM.
