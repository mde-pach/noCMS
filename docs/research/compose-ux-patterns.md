# Compose UX Patterns for noCMS

How leading visual builders handle the "compose" experience — concrete, adoptable interaction
patterns extracted from primary sources (product docs and the live apps), mapped to noCMS's
constraints: **layout is plain MDX/JSX text**, **components have typed props** (so an "insert"
is inserting a JSX node, and controls are *derived from prop types*, not hand-declared), and
the UX is organized by **progressive disclosure across altitudes L0–L4**:

- **L0 — inline content** (anyone): edit text/images in place.
- **L1 — compose** (creator): add/reorder/remove sections and components.
- **L2 — design tokens/themes** (brand owner): color, type, spacing as semantic bricks.
- **L3 — structure/collections** (power user): pages, nav, data, breakpoints.
- **L4 — raw code/plugins** (dev): JSX/MDX source, code components, sandboxed plugins.

Products studied: **Framer, Webflow, Builder.io, Plasmic, Notion, WordPress Gutenberg,
Wix Studio, Squarespace Fluid Engine**.

---

## Executive summary

The whole field converges on one shape: **a curated, previewable section library you insert
then customize in place**, plus **inline-first direct manipulation** and **complexity stacked
deepest-last**. The disagreements — and the lessons — are in the details.

1. **Insertion: the inline slash menu + one left-margin affordance is the gold standard**
   (Notion, Gutenberg). It is keyboard-first, triggers *at the cursor* with no modal, and
   fuzzy-filters live. Panel-only, drag-only inserters (Builder.io) are the slow baseline.
   Split *insert content* (`/`) from *run command* (`Cmd/Ctrl+K`) so the slash menu stays lean
   (Gutenberg). Keep the inserter *open and auto-zoom to the new section* so a whole page builds
   in one flow (Framer).
2. **Section library: categorize by page-role, show finished-looking thumbnails, seed with real
   placeholder content, insert-then-own with no hidden link** (Gutenberg Patterns, Squarespace,
   Wix Designed Sections). This is the single best defense against blank-canvas paralysis — *if*
   the default designs are genuinely good (Squarespace's dated library proves the cost of not).
3. **Direct manipulation: a constrained, flow/grid model is responsive-safe by construction;
   free absolute positioning is a documented anti-pattern** (Squarespace Fluid Engine's snap
   grid vs. Wix's docking/overlap bugs). Pair the canvas with an **outline/tree** for precise
   reordering — every product has one because deep-nest canvas drag is universally fragile.
4. **Controls from prop types is noCMS's structural advantage.** Builder.io and Plasmic both
   *hand-declare* control metadata (`inputs` / `meta.props`) that silently drifts from the real
   TS prop types. noCMS derives controls from the types directly — but should steal their rich
   *control vocabulary* and their progressive-disclosure primitives (`advanced`/`showIf`,
   bounded `slot`/`class` escape hatches).

Opinionated bottom line: noCMS should be **Notion's insertion ergonomics + Gutenberg's Pattern
library + Squarespace's grid discipline + Plasmic's control model — minus the hand-declared
drift, minus absolute positioning, minus the paywalled escape hatch.**

---

## 1. Insert / "add a section" UX

### Comparison across products

| Product | Primary inserter | Inline affordance | Keyboard / palette | Feels fast because… |
|---|---|---|---|---|
| **Notion** | `/` slash menu at cursor | Left-margin `+` on hover; `⋮⋮` drag-grip doubles as menu | `/` filters live; full keyboard nav; `Cmd/Ctrl+/` block actions | Triggers in place, no modal, fuzzy filter, *same verb inserts and commands* |
| **Gutenberg** | `/` slash + top-left global `+` (Block Library) | Between-block `+` at exact spot | `/` = insert; **`Cmd/Ctrl+K` = command palette** (navigation/settings, *not* insert) | Clean split keeps slash menu lean; between-block `+` targets precisely |
| **Framer** | Top-toolbar **Insert Menu** + single-key tools (`F` frame, `T` text) | — (draw on canvas) | `Cmd+K` quick actions; `Cmd+D` duplicates *remembering spacing* | **Insert menu stays open + canvas auto-zooms to the new section** → stack a whole page in one flow |
| **Webflow** | Left-rail **Add panel** (`A`), categorized | Drag shows **orange = parent, blue = position** | **Quick Find** (`Cmd+E`/`Cmd+K`): add element/component *and* `Cmd+Enter` to type class inline, repeat | Keyboard-only structure building; dual drag indicators make nesting legible |
| **Wix Studio** | Left-rail **Add Elements (+)** panel | Inline **+ Add Section** at boundary | Essentially none for insert | Two anchored entry points; inline insert avoids cross-viewport drag |
| **Squarespace** | **Add Section** button → full-width picker | Add Section between sections; **Add Block** in-section | Minimal (`G` toggles grid) | Click-to-insert gallery, not drag-from-rail — a deliberate "choose a section" moment |
| **Builder.io** | Right-rail **Insert tab**, category-browse, **drag-only** | None documented | None documented for insert | — (this is the slow baseline: no search, no thumbnails, no shortcut) |
| **Plasmic** | Left **big "+" button**, bound to **`Q`** | — | `Q` + **type-ahead search** + visual categories | Shortcut + search + thumbnails in one unified panel |

### What works vs. what fails

- **Inline-at-cursor beats panel-at-edge.** Notion's `/` and Gutenberg's between-block `+`
  insert *where you are looking*; Builder.io's drag-from-right-rail forces a panel→canvas
  trip with no search and no shortcut — the clear loser.
- **Keep the menu open + auto-reorient** (Framer): attacks the open-pick-close-reorient tax
  that makes stacking five sections feel like five chores.
- **Split insert from command** (Gutenberg): `/` inserts content, `Cmd/Ctrl+K` runs verbs
  (group, duplicate, customize CSS, open code). Prevents the slash menu bloating with
  non-insert actions.
- **One affordance, two jobs** (Notion): the left-margin `⋮⋮` is *both* a drag grip *and* a
  click-to-open action menu — an economy that keeps the gutter uncluttered.

### Recommended for noCMS

noCMS already edits prose with a transient ProseMirror view (`@nocms/prose`) and persists MDX
text — which makes the **inline `/` slash menu the natural primary inserter**: typing `/` in a
prose block opens a fuzzy-filtered list of components/sections; **Enter inserts the JSX node** at
the cursor's mdast position (the existing `position.ts` / index-path machinery already maps DOM
offset → mdast node). Complement with:

- A **left-margin `+`** on block hover (mouse-first parity), opening the same list.
- A **between-block insert line** with a clear drop indicator for the planned Pragmatic DnD
  (DECISIONS.md already names `@atlaskit/pragmatic-drag-and-drop` as the brick-insert primitive).
- **Split surfaces:** `/` inserts JSX nodes; a separate `Cmd/Ctrl+K` command palette runs editor
  verbs (duplicate, wrap in Section, view source, theme). Do **not** let `/` summon heavy
  constructs (the Notion "accidental database" trap) — gate collections/data behind the palette
  or an explicit Advanced group.

Because an insert is literally "splice a JSX node into the mdast," the slash result must carry an
**MDX snippet + metadata** (the curated layout-brick the project already plans) — pick the entry,
splice the snippet, re-serialize, re-render through the one renderer.

---

## 2. Section / template library

### Comparison across products

| Product | Presentation | Categorized | Search | Thumbnails | Seeded content | Reuse model |
|---|---|---|---|---|---|---|
| **Gutenberg** | **Patterns** tab + Explore modal | Yes (dropdown) | Yes (`/` searches patterns too) | **Large previews** | Yes | Insert-then-own (no link); **Synced Patterns** + **Detach** for true reuse |
| **Squarespace** | Full-width **Add Section** gallery | Yes (People, Team, Testimonials, Services, Gallery…) | — | **Yes** | **Yes — "auto layouts" pre-populate placeholder text/images** (`ⓘ` badge) | **My Saved Sections** |
| **Wix Studio** | **Designed Sections** + **Wireframes** (blank-but-structured) | Yes (by page-role) | — | Yes | Partial | **Save as Asset** → Design Library; **Global Sections** sync |
| **Framer** | Insert Menu **Sections** tab | Yes | — | Yes | **No — "minimally styled"** (adopt structure, apply your tokens) | Components in Assets; **Workspace Library** linked instances |
| **Webflow** | Add panel → **Layouts → Starter Library** | Yes (dropdown) | Via Quick Find | Yes | Partial | **Components** (ex-Symbols) update globally w/ overrides |
| **Builder.io** | Insert tab categories | Yes | No | No | — | **Templates** (copy-then-customize) vs **Symbols** (global); Symbols accept block inputs |
| **Plasmic** | Insert panel + **Component Store** | Yes | Yes | Yes | Partial | Store auto-installs deps; project components |

### What works vs. what fails

- **The winning recipe (Gutenberg + Squarespace + Wix):** *categorize by page-role* (Hero,
  About, Features, Pricing, Testimonials, FAQ, Footer) · *finished-looking preview thumbnails* ·
  *seed with real placeholder content* so the user edits real-looking copy, not an empty box ·
  *insert-then-own with no hidden dependency*. This is the strongest blank-canvas defense in the
  field.
- **Seed-with-content vs. minimally-styled is a real fork.** Squarespace/Wix seed; Framer ships
  "minimally styled" sections (insert structure, apply tokens). For a *true non-designer*, seeded
  content wins — Framer "assumes some taste."
- **Offer a "blank-but-structured" wireframe tier** (Wix Wireframes): a middle rung between
  fully-designed and empty, a smart paralysis reducer.
- **Insert-then-own beats hidden links by default** (Gutenberg: "once you add a Pattern there is
  no link to the original"), but offer an *opt-in* synced/global mode + a **detach** escape
  (Gutenberg Synced Patterns, Wix Global Sections) for footers/CTAs.
- **Anti-pattern (Squarespace):** categorization + previews *fail* if the default designs look
  dated — pros route around them to third-party packs. **The curated library must be genuinely
  good.**

### Recommended for noCMS

Build the **curated layout-brick library** (already planned in DECISIONS.md) as
*MDX snippets + metadata*, presented in the `/` menu and a dedicated browse panel:

- **Category by page-role** matching the `@nocms/components` primitives already present
  (`Hero`, `Section`, `Card`, `Grid`, `Stack`, `Form`, `LatestPosts`, …). Each brick is an MDX
  snippet composing those typed components.
- **Seed with real placeholder content** inside the snippet (headline, body, image) so insertion
  yields a finished-looking section editable in place via L0 prose editing.
- **Preview thumbnails** rendered through the one renderer (invariant #1) — the preview *is* the
  publish output, so thumbnails are free and always accurate.
- **Insert-then-own**: splicing the snippet copies it into the page MDX; no hidden link. For
  shared footers/nav, a later "synced section" can be a referenced MDX include (L3 structure),
  with detach = inline the include.
- **Quality bar is a hard requirement.** A small, opinionated, genuinely-good set beats a large
  mediocre one — this matches the project's "opinionated, standard-user-proof" north star.

---

## 3. Direct manipulation on canvas

### Comparison across products

| Pattern | Best-in-class | Notes |
|---|---|---|
| **Reorder** | Notion `⋮⋮` drag with **blue drop guides** (incl. into columns) | Every product also offers tree-reorder because canvas deep-nest drag is fragile |
| **Inline text edit** | Notion / Gutenberg (inline-first); Framer/Webflow double-click | noCMS already has this via `@nocms/prose` double-click |
| **Selection / handles** | Squarespace per-block resize handles; Framer Figma-grammar selection | `Enter` selects parent / `Cmd+Enter` first child (Framer) is a clean traversal to copy |
| **Contextual toolbar** | Gutenberg block toolbar (pinnable to top); Notion selection toolbar | — |
| **Outline / tree** | Webflow **Navigator** (`Z`); Plasmic outline; Gutenberg List View | The reliable fallback when canvas drag fails |
| **Grid model** | **Squarespace Fluid Engine 24-col snap grid** (overlay on drag, `G` toggle) | Responsive-safe *by construction* |
| **Undo/redo** | Unified history everywhere | noCMS plan: one undo over mdast/text (avoid per-region isolation) |

### What is robust vs. fragile

- **Robust: constrained flow/grid placement.** Squarespace Fluid Engine snaps to a 24-column
  grid with a visible overlay; resizing one block doesn't shove neighbors; overlap is explicit
  (Bring Forward / Send Backward). The model itself prevents most responsive breakage.
- **Robust: outline tree as the precision surface.** Webflow's Navigator exists *because*
  on-canvas drag into nested flex/grid is "famously finicky" — a tell that canvas drag alone is
  not trustworthy for nesting. Plasmic auto-creates stacks when you drag beside an element (no
  pre-making containers) — a great robustness move.
- **Robust: inline-first editing + one affordance** (Notion): every block is a uniform unit with
  one `⋮⋮` handle that drags *and* opens a menu.
- **Fragile: free absolute positioning.** Wix Studio's docking/margins let elements be placed
  absolutely → documented overlap, shift, and gap bugs across breakpoints; Wix ships a "Scan for
  responsive issues" tool to clean up after its own model. **Avoid as default.**
- **Fragile: freeform pixel placement without auto-layout** (Framer) — a beginner who skips
  Stacks builds layouts that break on resize, with no guardrail.
- **Anti-pattern: mode-switching to preview** — Plasmic retired its one-variant-per-artboard
  model for a single canvas with an in-place **Interactive** toggle.

### Recommended for noCMS

- **Selection overlay + outline tree, both backed by mdast index-paths.** The canvas already
  reports the selected node by index-path (`indexPathOf`/`nodeAtIndexPath`, offset-stable across
  edits) and draws a non-interactive selection overlay. Add a **layers/outline panel** derived
  from mdast (DECISIONS.md feature #6) as the reliable reorder surface — don't rely on canvas
  drag alone for nesting.
- **Drag-reorder via Pragmatic DnD with a clear drop indicator** (Notion's blue guide), operating
  on **whole mdast nodes** — drag reorders/ splices nodes, then re-serialize. Because the artifact
  is line-diffable MDX, a reorder is a clean block move in git.
- **No absolute positioning, ever.** Layout flows through typed layout components (`Section`,
  `Stack`, `Grid`, `Container`) — responsive-safe like Fluid Engine, and expressible as JSX text
  (invariant #5). Prefer **one responsive description** over per-breakpoint hand-editing (avoid
  Fluid Engine's two-sources-of-truth desktop/mobile trap).
- **Inline-first L0 editing** is already shipped (double-click prose). Add a small **selection
  formatting toolbar** (the `proseView()` escape hatch already exists) and **hierarchy traversal**
  (select parent/child) à la Framer.
- **One unified undo over mdast/text** (already the plan) — never per-region isolation.

---

## 4. Progressive disclosure → noCMS's L0–L4

### How the field layers simple → advanced

| Tier | Notion | Gutenberg | Framer | Webflow | Wix | Squarespace | Builder/Plasmic |
|---|---|---|---|---|---|---|---|
| **Simple** | type text | write + block toolbar | visual edit | (weak) | named responsive behaviors | **Style Editor** (named controls) | visual props |
| **Mid** | lists/callouts `/` | Settings/Styles sidebar | Stacks + constraints | Style panel (box model) | breakpoints + grid | — | `advanced`/`showIf` fold |
| **Power** | databases, relations, formulas | Advanced panel + CSS class | breakpoints (spatial) | CMS collections, cascade | Advanced CSS Grid | Custom CSS (**paywalled**) | data binding tab |
| **Code** | — | Edit as HTML / Code editor | **code components / overrides** | custom code embed | **Velo** (opt-in "Start Coding") | Code blocks (gated) | `type:'code'`, codegen |

### What works vs. what fails

- **Complexity stacked deepest-last works** (Gutenberg: text → block styles → Advanced → CSS
  class → Edit as HTML → Code editor → theme.json). But Gutenberg also shows the **failure
  modes**: *overwhelm* (too many block types, confusing icons), the **hover-only-reveal trap**
  ("hide everything until the user hovers the magic spot" — Remove Block buried in a `⋮` menu),
  and **conflating writing with layout** (every paragraph a block breaks writing flow).
- **Named-intent controls before raw values** (Squarespace Style Editor "changes CSS for you";
  Wix responsive behaviors like Stretch/Relative) — a good simple→advanced rung.
- **Code fully opt-in and hidden until invoked** (Wix's "Start Coding" spawns the IDE; non-devs
  never see it) is the right gating.
- **Bounded escape hatches beat raw code boxes** (Plasmic): `class` exposes CSS scoped to named
  `styleSections`/`selectors`; `slot` scopes droppable children to `allowedComponents`. Prefer
  these over an unbounded code embed.
- **Control vocabulary to steal** (Builder.io `inputs` / Plasmic `meta.props`): `string`/`text`/
  `longText`/`richText`, `number` (slider w/ min/max/step), `boolean`, `color`, `enum`/`choice`
  (incl. `cardPicker` visual grid), `list`/`array` (+ `subFields`/`itemType`), `object` (nested
  `fields`), `slot`, `eventHandler`, `reference`, `code`. Progressive-disclosure primitives:
  `advanced:true` → "Show More", `showIf`/`hidden:(props)=>bool` conditional controls, `folded`
  for big objects.
- **The field-wide failure noCMS fixes:** both Builder.io and Plasmic **hand-declare** control
  metadata that *silently drifts* from the real TS prop types — props missing, mistyped, or
  stale, with no compiler enforcement. noCMS derives controls from the types (`@nocms/props-
  discovery`), so the editor UI cannot drift. **Treat the field-config as override only, never
  source** (already the design: `bridgeFieldConfig` overlays `help`/`group` only).

### Mapping to noCMS L0–L4

- **L0 — inline content (anyone).** Double-click prose editing (shipped); inline image/alt edit.
  No chrome beyond a selection toolbar. *Never* require touching layout to change a word — the
  opposite of Webflow's "box model on day one."
- **L1 — compose (creator).** `/` insert + section library + drag-reorder + the **props panel**.
  The props panel renders controls from the discovered `Control` vocabulary
  (`text|number|boolean|select|slot|action|media` — `@nocms/props-discovery`), grouped by
  `Control.group`. Adopt `advanced`/`showIf`-style folding so a `Hero` shows headline+image first,
  rare props behind "More". This is where most users live.
- **L2 — design tokens/themes (brand owner).** The **TokensPanel** (shipped): semantic,
  human-labeled bricks (brand color, fonts, spacing, radius), never raw var names; edits rewrite
  one `<style>` live (runtime CSS vars, no rebuild — invariant #3). This is noCMS's answer to
  Squarespace's Style Editor — but free and decentralized, not paywalled.
- **L3 — structure/collections (power user).** Pages/nav/outline tree from mdast; content
  collections (`@nocms/core` schema); responsive breakpoints expressed as *one* responsive
  description on layout components (not per-breakpoint hand-editing); data binding to collections
  (Builder's "Repeat for each" / Plasmic `DataProvider` are the references). Gate behind explicit
  entry, not the `/` menu.
- **L4 — raw code/plugins (dev).** A CodeMirror MDX source view (DECISIONS.md "option A scaffold"
  — already the power-user code view), code components, and **sandboxed plugin bricks**
  (`@nocms/sandbox`, invariant #8 — plugins never get the token/DOM/network). Bounded escape
  hatches (Plasmic `slot`/`class` model) over raw embeds where possible.

---

## Anti-patterns to avoid (consolidated)

1. **Hand-declared control metadata that drifts from real prop types** (Builder.io `inputs`,
   Plasmic `meta.props`). noCMS derives from TS types — keep field-config as *override only*.
2. **Free absolute positioning as default** (Wix docking) → overlap/shift/gap bugs across
   breakpoints. Use constrained flow/grid layout components.
3. **Panel-only, drag-only, no-search inserter** (Builder.io Insert tab). Always provide an
   inline `/` + search + shortcut.
4. **Coupling all power to the box model on day one** (Webflow — no genuine simple tier; 2–4 week
   ramp). Keep L0/L1 truly simple; expose layout internals only at L3.
5. **Hover-only-reveal of important controls** (Gutenberg's buried Remove Block). Critical actions
   must be discoverable, not hidden behind a `⋮` on hover.
6. **Letting the slash menu summon heavy constructs** (Notion's accidental database). Gate
   collections/data behind the command palette or an Advanced group.
7. **Mode-switching to preview / one-variant-per-artboard** (Plasmic's retired model). Edit in one
   place; preview in-canvas.
8. **Scattering editing across many sibling tabs** (Builder Insert/Options/Style/Layers/Data).
   Consolidate; minimize "where do I look" cost.
9. **A large mediocre section library** (Squarespace's dated defaults). Curate a small,
   genuinely-good set.
10. **Two sources of truth for responsive** (Fluid Engine desktop+mobile grids). Prefer one
    responsive description.
11. **Paywalling the escape hatch** (Squarespace custom CSS). noCMS is MIT/free-path — code view
    and plugins are open to all.
12. **Conflating writing with layout** (Gutenberg every-paragraph-a-block). Keep L0 prose flow
    fluid; reserve block/section chrome for L1.

---

## Recommendations mapped to the Phase-1 build

noCMS's editor already has the spine (per DECISIONS.md D2): live canvas through the one renderer,
selection mapping via mdast source positions / index-paths, a schema-injected props panel, prose
editing, and a tokens panel. The Phase-1 compose work is the **insert + library + reorder** layer.

| Phase-1 piece | Recommended pattern | Source(s) | noCMS hook |
|---|---|---|---|
| **Insert palette** | Inline `/` at cursor, fuzzy-filtered, full keyboard nav, **Enter splices a JSX node** at the mdast position; left-margin `+` for mouse; **keep open + auto-scroll to the new section**; split `/`(insert) from `Cmd/Ctrl+K`(commands) | Notion, Gutenberg, Framer | `@nocms/prose` `/` trigger → `position.ts` mdast offset → splice MDX snippet → re-serialize/re-render |
| **Drag-reorder** | Pragmatic DnD on **whole mdast nodes**, **blue drop indicator**, **outline tree** as the precision fallback; no absolute positioning | Notion, Squarespace, Webflow Navigator | `@atlaskit/pragmatic-drag-and-drop` (named in DECISIONS); reorder nodes → re-serialize; layers panel = feature #6 |
| **Inline edit (L0)** | Double-click prose (shipped); add a **selection formatting toolbar** + parent/child traversal | Notion, Framer | `@nocms/prose` `proseView()` escape hatch |
| **Props panel (L1)** | Controls **derived from TS prop types** (not hand-declared); **group by role**, **fold rare props behind "More"** (`advanced`), conditional controls; steal the rich control vocabulary | Plasmic, Builder.io | `@nocms/props-discovery` `Control` (`text\|number\|boolean\|select\|slot\|action\|media`) + `bridgeFieldConfig` (override only); `PropsPanel` |
| **Curated section library** | MDX snippets + metadata, **categorized by page-role**, **finished thumbnails via the one renderer**, **seeded placeholder content**, **insert-then-own**, plus a **wireframe tier**; quality bar is hard | Gutenberg Patterns, Squarespace, Wix | curated layout-brick library (DECISIONS feature #2) over `@nocms/components` primitives |
| **Tokens (L2)** | Semantic human-labeled bricks, live `<style>` rewrite, no rebuild — already shipped | Squarespace Style Editor | `TokensPanel` + `@nocms/tokens` |

**Sequencing for Phase-1:** (1) wire the inline `/` insert over the existing prose seam against a
small seeded section library; (2) add the outline tree + Pragmatic DnD node-reorder; (3) enrich
the props panel with grouping + advanced-folding from the discovered controls; (4) add the
`Cmd/Ctrl+K` command palette for non-insert verbs. L3/L4 (collections, breakpoints, code view,
plugins) follow as separate altitudes once L0–L2 are solid.

---

### Sources

- **Notion:** [slash commands](https://www.notion.com/help/guides/using-slash-commands) ·
  [writing & editing basics](https://www.notion.com/help/writing-and-editing-basics) ·
  [synced blocks](https://www.notion.com/help/synced-blocks) ·
  [template gallery](https://www.notion.com/help/guides/the-ultimate-guide-to-notion-templates) ·
  [database templates](https://www.notion.com/help/database-templates)
- **Gutenberg:** [block editor docs](https://wordpress.org/documentation/article/wordpress-block-editor/) ·
  [block patterns](https://wordpress.org/documentation/article/block-pattern/) ·
  [command palette](https://wordpress.com/blog/2023/10/18/introducing-command-palette/) ·
  [block editor handbook](https://developer.wordpress.org/block-editor/) ·
  critiques [abrightclearweb](https://www.abrightclearweb.com/user-experience-accessibility-gutenberg-wordpress-block-editor/),
  [room34](https://blog.room34.com/archives/8891/)
- **Framer:** [keyboard shortcuts](https://www.framer.com/help/articles/keyboard-shortcuts/) ·
  [sections update](https://www.framer.com/updates/sections) ·
  [components academy](https://www.framer.com/academy/lessons/framer-fundamentals-components) ·
  [adaptive layout](https://designcode.io/framer-web-design-adaptive-layout/)
- **Webflow:** [Add panel](https://help.webflow.com/hc/en-us/articles/33961270096659-The-Add-panel) ·
  [Quick find](https://help.webflow.com/hc/en-us/articles/33961382093587-Quick-find) ·
  [Starter Library](https://help.webflow.com/hc/en-us/articles/33961353022739-Starter-Library) ·
  [box model](https://university.webflow.com/article/the-box-model)
- **Wix Studio:** [adding/managing sections](https://support.wix.com/en/article/studio-editor-adding-and-managing-sections) ·
  [designed sections](https://www.wix.com/studio/academy/library/designed-sections) ·
  [flexbox vs grid](https://support.wix.com/en/article/studio-editor-choosing-between-flexbox-based-and-grid-based-tools) ·
  [docking/margins/padding](https://support.wix.com/en/article/studio-editor-working-with-docking-margins-and-padding) ·
  [troubleshooting responsiveness](https://support.wix.com/en/article/studio-editor-troubleshooting-responsiveness-issues) ·
  [Velo overview](https://dev.wix.com/docs/develop-websites/articles/coding-with-velo/overview/about-coding-with-wix-studio)
- **Squarespace:** [edit with Fluid Engine](https://support.squarespace.com/hc/en-us/articles/6421525446541-Edit-your-site-with-Fluid-Engine) ·
  [page sections](https://support.squarespace.com/hc/en-us/articles/360027987711-Page-sections) ·
  [auto layouts](https://support.squarespace.com/hc/en-us/articles/360057763852-Auto-layouts) ·
  [CSS editor](https://support.squarespace.com/hc/en-us/articles/206545567-Using-the-CSS-Editor) ·
  [Fluid Engine engineering](https://engineering.squarespace.com/blog/2022/developing-fluid-engine)
- **Builder.io:** [insert tab](https://www.builder.io/c/docs/insert-tab) ·
  [block types](https://www.builder.io/c/docs/block-types) ·
  [input types](https://www.builder.io/c/docs/custom-components-input-types) ·
  [custom components setup](https://www.builder.io/c/docs/custom-components-setup) ·
  [data binding](https://www.builder.io/c/docs/data-binding)
- **Plasmic:** [code components ref](https://docs.plasmic.app/learn/code-components-ref/) ·
  [code components](https://docs.plasmic.app/learn/code-components/) ·
  [components](https://docs.plasmic.app/learn/components/) ·
  [responsive design](https://docs.plasmic.app/learn/responsive-design/) ·
  [new insert panel](https://plasmic.substack.com/p/new-insert-panel-simpler-dragdrop) ·
  [simplified canvas](https://plasmic.substack.com/p/introducing-new-simplified-canvas) ·
  [Component Store](https://plasmic.substack.com/p/introducing-the-plasmic-component)
