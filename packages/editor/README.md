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

## Editing surface

The live site *is* the canvas: `@nocms/renderer` renders the MDX→Preact tree in editor
mode — the same tree the publish build prerenders — so "what you preview is what you
publish" (invariant #1) holds by construction, with no second renderer. The editor is a
bespoke composition of noCMS packages, not an adopted visual builder; see DECISIONS.md D2
for the architecture decision and the alternatives rejected.

`mountEditor` (`shell.tsx`) is the interaction loop and the package's main entry. It keeps
one live mdast document and wires four edit surfaces over it:

- **Select** — a canvas click resolves through injected `data-mdx-pos` source offsets to
  the mdast node path (`position.ts`), then up to the meaningful node — nearest component
  or block (`selectable.ts`). The selection is tracked by **index-path**, which stays valid
  across edits (raw offsets shift), and drawn with a non-interactive overlay.
- **Configure** — `@nocms/props-discovery` schemas (injected ahead of time, not discovered
  live in the browser) drive a friendly control-per-prop panel (`props-panel.tsx`) that
  mutates the selected JSX node's attributes (`jsx-attributes.ts`). Props are never exposed
  as raw JSON (invariant #10).
- **Edit text in place** — double-clicking a paragraph or heading mounts a transient
  ProseMirror view (`@nocms/prose`) over the block, seeded with its mdast inline children;
  edits splice back into the document on commit (click-out or Escape). The canvas is *not*
  re-rendered mid-edit — that would tear the view out.
- **Theme** — when a flat token source is supplied, the design panel (`tokens-panel.tsx`)
  edits `@nocms/tokens` as semantic, human-labeled choices and rewrites one `<style>` of CSS
  variables live. Theming never triggers a rebuild (invariant #3).

After any structural edit the shell re-serializes mdast→MDX, re-renders the canvas from that
source through the one renderer, re-highlights by index-path, and fires `onChange(mdx)` —
the seam a host wires to save/publish (`@nocms/session`).

## Editor UI

`mountEditor` frames the canvas with the app chrome and a docked rail; the screens below are
also exported as standalone presenters a host can compose.

- **Chrome** (`chrome.tsx`) — the 56px top bar: breakpoint segmented (`L0`–`L4`, sizing the
  canvas surface), appearance toggle, save status, the 4-state Publish button, avatar.
- **Rail** — page-properties (`rail.tsx`: title/description + the Design & brand entry +
  "Add a section") when nothing is selected; schema-derived block-properties (`props-panel.tsx`)
  when a block is. Every control kind renders to spec (segmented selects, sliders, toggles,
  image control, advanced fold); nested `group`/`list` stay structural (the scalar attribute
  model can't represent them — deferred).
- **Design & brand** (`tokens-panel.tsx`) — a curated swatch palette + corner-radius slider
  that rewrite the runtime CSS-var `<style>` live (no rebuild).
- **Insertion** — the catalog insert sheet (`catalog.tsx`) with rendered mini-previews,
  intent-grouped cards, and search/empty states; it consumes manifests only, so built-in and
  sandboxed-plugin components are interchangeable.
- **Other screens** — `navigator.tsx` (pages + live section outline), `media.tsx` (asset
  picker for image controls), `publish.tsx` (async publish popover), `format-bar.tsx`
  (inline bold/italic/link over the prose view), `sign-in.tsx` (first-run gate), and
  `library-manager.tsx` (manage installed packs).

**Accent discipline:** the chrome accent is slate (`--nc-accent`) — Publish, selection,
"Add a section", active toggles, Insert. Terracotta (`--nc-rust`) is reserved for live-canvas
site content and the brand-token swatches a user picks from; the two are distinct CSS vars in
`theme.ts` so they never mix. The whole stylesheet is scoped under `.nocms-editor`, so chrome
styling never leaks into the rendered site.
