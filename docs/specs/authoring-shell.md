# Spec — Authoring Shell (Phase 1)

The daily surface: how a creator composes a page on the live canvas. This spec covers the
**compose** layers (L0 content, L1 components) and how the shell *progressively reveals* L2–L4.
It is grounded in `docs/research/compose-ux-patterns.md` and assumes D9 (schema-driven controls)
and D2 (mdast/MDX text is the source of truth).

> **North star:** building a page feels like *writing with structure* — keyboard-first, inline,
> insert-then-customize — never like wiring a diagram. Every action is a transform on the MDX
> tree, so preview === publish (invariant #1) holds by construction.

## 0. Anatomy

A three-region shell over the live renderer:

- **Canvas (center).** The rendered page, directly manipulable. Single source of visual truth —
  it *is* the renderer, not a facsimile.
- **Inspector (right).** Context-sensitive: the props panel for the selected node; collapses to
  page settings when nothing is selected. Hosts L1 (props) and folds open to L2 (tokens/theme).
- **Library / structure (left, on demand).** The section/component library browser and the page
  outline (tree of nodes). Not always visible — summoned, not parked.

The shell chrome is intentionally minimal; the canvas is the product.

**The block model (D15).** Everything on the canvas is a block in one uniform tree — content,
layout, and plugin blocks alike. Containers (`Section`/`Stack`/`Grid`, or a plugin's) are blocks
with **slots** that hold child blocks: the block owns the surrounding structure, the host owns the
children (the user's MDX, selectable/editable here). Text is a block whose interior is the prose
editor. The tree is persisted as **canonical MDX** by a deterministic serializer (readable +
churn-free diffs). All canvas interactions below are transforms on this one tree.

## 1. Direct manipulation on the canvas

**Selection.** Click selects the nearest selectable node (`SELECTABLE_TYPES` from `@nocms/editor`).
A second click descends one level (section → child). Selection shows a single thin outline + a
small **node tag** (component name) at a corner — no busy multi-handle chrome. Esc deselects.

**Inline text editing.** Text is edited *in place* — no separate text field. Click into a heading
or paragraph and type; it round-trips through the prose seam to the mdast text node. This is L0 and
must work with zero selection ceremony (the research's strongest cross-product signal: inline-first).

**Reorder.** Drag a selected section to reorder among siblings, with a clear **drop line** between
blocks (not free positioning — see anti-patterns). Reorder is a sibling-array move in the tree.
Keyboard equivalent: `Alt+↑/↓` moves the selected node among siblings (accessibility + speed).

**Contextual toolbar.** A small floating toolbar on selection: duplicate, delete, move up/down,
and "convert to" where sensible. Mirrors the node tag; disappears on deselect.

**Undo/redo.** History is a stack of tree transforms (`Cmd/Ctrl+Z` / `Shift+Cmd/Ctrl+Z`). Because
every edit — inline text, prop change, insert, reorder — is one tree transform, undo is uniform
and reliable (the fragility the research flagged comes from products with two edit models; we have
one). Each transform is atomic and reversible.

**No absolute positioning, ever.** Layout flows through typed layout components (`Section`,
`Stack`, `Grid`, `Container`). This is responsive-safe *by construction* and is exactly what's
expressible as clean, line-diffable JSX (invariant #5). (Wix Studio ships a "scan for responsive
issues" tool to clean up after its own absolute model — a tell we design away.)

## 2. Insertion

Two complementary inserters, sharing one insert action (= splice a JSX node at a source position):

**a) Slash menu — the primary inserter.** Typing `/` at a text cursor opens a fuzzy-filtered,
live-previewed menu *at the cursor*; Enter inserts the chosen block at that exact source position
(via `position.ts`'s offset→mdast mapping). Keyboard-first, no modal. After insert, **keep focus
flowing** — selection lands on the new node's first editable slot so a whole page builds in one
stream (Framer's "keep going" pattern). `/` inserts *content/components*; **`Cmd/Ctrl+K` is a
separate command palette** (navigate, run actions) so neither menu bloats (Gutenberg's split).

**b) "+" insert handles.** A thin "+" affordance appears on hover *between* sibling blocks and at
the empty end of a container. Click → the same menu, scoped to "what's valid here." This is the
discoverable, mouse-first path for users who won't learn `/`.

Both routes resolve to the same `insert(node, atPath)` tree transform. Insert validity is derived
from the parent component's allowed children (where declared) so the menu only offers legal nodes.

## 3. The section library

The cure for blank-canvas paralysis — **if and only if the sections are genuinely excellent**. A
*small, opinionated* set beats a large mediocre one (Squarespace's dated defaults pushed pros to
third-party packs — the failure mode to avoid; matches the "standard-user-proof" goal).

- **Organized by page-role**, not by primitive: Hero, Features, Pricing, Testimonials, FAQ,
  Call-to-action, Team, Footer, … A creator thinks "I need a pricing section," not "I need a Grid."
- **Real thumbnails, rendered free** through the one renderer (preview === publish), so a thumbnail
  can never lie about the result.
- **Seed real placeholder content**, not lorem-grey boxes — an inserted section looks finished, then
  you edit it down. **Insert-then-own:** the inserted section is plain MDX/JSX in *your* file, with
  no hidden link back to a template (no "detach" step, no upstream coupling).
- A section is just a **saved composition of the curated components** — authored in the same model,
  so the library is extensible (and later, plugin-contributed) without a second mechanism.

Sections live at L1; picking one is the fastest L1 action. Browsing happens in the left library
panel (summoned), searchable, with category filters.

## 4. The props panel & controls (D9)

When a node is selected, the inspector shows controls **derived by introspecting the component's
valibot props schema** — no hand-authored control metadata (D9). One derivation serves both
component props here and collection fields elsewhere (lives in `core`).

- **Base controls** from base types: `string`→text, `number`→number, `boolean`→toggle,
  `picklist`→select, nested `object`→a grouped sub-panel, `array`→repeatable list.
- **Meta-types** from `v.metadata({ control })` / brands map to rich controls: `color`→swatch
  picker bound to the token palette (so colors are *token references*, not raw hex — keeps L2
  coherent), `url`, `image`→media picker, `range`→slider, `richtext`→inline prose. Unknown control
  hints fall back to the base control gracefully.
- **Progressive folding:** required/common props show first; props marked `advanced` collapse under
  a "More" disclosure (Builder.io/Plasmic's `advanced`/`showIf` pattern, worth stealing). Controls
  can declare a `showIf` dependency so irrelevant controls hide (e.g. hide "image alt" until an
  image is set).
- **Field-config is override-only** — the thin escape hatch to relabel/reorder/hide a derived
  control, never the source of one.
- **Plugin parity:** because the schema travels with the component and is introspected at runtime,
  a sandboxed plugin component gets a real props panel with zero extra work — the same derivation,
  inside the sandbox boundary (invariant #8).

## 5. Progressive disclosure across the shell

The same shell serves every audience by *revealing depth on demand*, never front-loading it:

| Altitude | In the shell | Trigger to reach it |
|---|---|---|
| **L0 Content** | Inline text edit, swap image, fill a field | Default — click and type |
| **L1 Compose** | Slash/"+"/library insert, reorder, props panel | Select a node / press `/` |
| **L2 Design** | Token-bound color/spacing controls, theme switch | Inspector "Design" fold; tokens panel |
| **L3 Structure** | Page outline tree, nav, collections | Left "Structure" tab |
| **L4 Extend** | Edit raw MDX, custom/plugin components | "Edit as MDX" affordance; plugin install |

The rule: **you can always drop down a layer; you are never forced up one.** A non-dev never sees
MDX; a dev is one affordance away from it — same file underneath.

## 6. Anti-patterns to avoid (from the research)

1. **Drag-only insertion, no keyboard, no search** (Builder.io right-rail) — slow, undiscoverable.
2. **Free / absolute positioning** (Wix-style) — breaks responsive by construction.
3. **Large mediocre template galleries** — paralysis + drives users to third-party packs.
4. **Lorem-grey placeholder** — inserted sections must look finished.
5. **Hidden template links / detach steps** — inserted content must be plainly the user's own MDX.
6. **Hand-declared control metadata** that drifts from real prop types (Builder.io `inputs`) — D9
   eliminates this.
7. **Two edit models** (one for text, one for layout) — makes undo/selection fragile; we keep one
   tree-transform model.
8. **Modal inserters that steal focus** — break the build-in-one-flow rhythm.

## 7. Open questions → Claude Design exploration targets

To prototype in Claude Design before implementing (per the design workflow in `VISION.md`):

- Exact **slash-menu** visual + grouping, and how section-vs-component are distinguished in one list.
- **Selection chrome** density — node tag + outline + floating toolbar without visual noise.
- The **section library** browser: grid density, category nav, search, thumbnail framing.
- **Inspector** information architecture: how L1 props and the L2 design fold coexist without a wall
  of controls; how `advanced`/`showIf` folding feels.
- The **"edit as MDX"** L4 affordance — discoverable to devs, invisible to non-devs.

## Next specs

- **Onboarding (Phase 0)** — the create→live wizard; the make-or-break flow.
- **Controls system** — a deeper technical spec for the `core` schema→control mapper (D9), if the
  section above proves it needs its own surface.
