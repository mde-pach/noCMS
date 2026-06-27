# Handoff: noCMS — In-Site WYSIWYG Editor

## Overview
This package documents the complete in-site editor for **noCMS**, an open-source website
builder that turns a GitHub repo into a live site the owner edits directly on the page.
The editor *is* the product: the owner selects sections, edits text in place, restyles the
whole site with design tokens, inserts sections from a curated catalog, and publishes with
one async click. This handoff covers the app chrome, the editable canvas, the contextual
property rail, the design/brand token panel, the component catalog, the pages navigator, the
publish flow, the media picker, the sign-in gate, the library manager, a responsive state,
and a control-kind/card-state spec board.

## About the Design Files
The files in this bundle are **design references created in HTML** (as "Design Components,"
a small streaming-template runtime). They are prototypes that show the intended look and
behavior — **not production code to copy directly.** Your task in the dev session is to
**recreate these designs in your target codebase** using its established framework, component
library, and conventions (React, Vue, Svelte, SwiftUI, etc.). If no codebase exists yet,
choose the most appropriate framework for an interactive editor (React + a state library is a
natural fit) and implement there.

Read the `.dc.html` files for exact markup, measurements, and inline styles. The structure
(template + a small logic class returning `renderVals`) maps cleanly to function components +
props/state — but the runtime itself (`support.js`) is **not** something to port; it is only
here so the references render when opened in a browser.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, radii, and interaction states are
all intentional and specified below. Recreate the UI pixel-faithfully using your codebase's
libraries and patterns — match the tokens exactly. The mono micro-labels and the 10px radius
are load-bearing brand details; do not drop them.

---

## Design Tokens

### Color
| Token | Hex | Use |
|---|---|---|
| `shell` | `#EAE8E3` | App shell behind the site (warm light greige) |
| `surface` | `#FFFFFF` | Panels, cards, rail, sheets |
| `surface-muted` | `#FBFAF7` | Inset panels, group blocks, preview backdrops |
| `field` | `#F4F2ED` | Segmented-control track, icon chips, idle pills |
| `text` | `#1A1916` | Primary text (near-black charcoal) |
| `text-secondary` | `#6B6760` | Secondary / labels |
| `text-tertiary` | `#A39E94` | Faint mono labels, placeholders |
| `accent-primary` | `#B0542F` | Primary buttons, eyebrows, brand mark (terracotta/rust) |
| `accent-interactive` | `#3D5A98` | Links, active toggles, selection, the "Add a section" CTA (slate blue) |
| `status-amber` | `#C8862F` | Unsaved-edits indicator |
| `olive` | `#5B6B4A` | Success / published, live-site dot |
| `border` | `#E0DDD6` | Hairline borders on inputs, cards, rail |
| `border-faint` | `#EFEDE7` | Internal dividers, lighter separators |

**Brand swatch palette** (the color token a user picks from):
terracotta `#B0542F` · olive `#5B6B4A` · slate blue `#3D5A98` · ochre `#BC9A4A` · near-black `#1A1916`.
The active swatch gets a ring: `box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 4px #3D5A98`.

Tinted status backgrounds: published `#EEF1E9` text `#4A5A3A`; error `#FBEDE9` text `#9A3B23`;
interactive-tint `#EEF1F7` text `#3D5A98`.

### Typography
- **Display / site headings:** `Lora` (refined transitional serif). Weights 400/500/600,
  tight leading (`line-height: 1.04` on the hero `h1`), `letter-spacing: -0.02em` on large display.
  Hero `h1` 56px (desktop) / 34px (mobile L0). Section `h2` 30px. Card titles 17px.
- **Body / UI:** `Inter`. 13–15px UI, 17px site body copy, `line-height: ~1.5`.
- **Micro-labels:** `IBM Plex Mono`, ~11px, `letter-spacing: 0.08em`, `text-transform: uppercase`,
  color `text-secondary`/`text-tertiary`. Used for **every field/section label** (`TITLE`,
  `DESCRIPTION`, `APPEARANCE`, `CORNER RADIUS`, `ACTIONS`, category headers, badges). Signature detail.

### Shape & spacing
- Corner radius: **10px** on cards, inputs, buttons. Inset/group panels 11–12px. Sheets/modals 14–16px.
- Segmented controls & pills: fully rounded (`border-radius: 999px`), 3px track padding, active
  segment = white fill + `box-shadow: 0 1px 2px rgba(0,0,0,0.08)`.
- Shadows are subtle: cards `0 1px 2px–3px rgba(26,25,22,0.04–0.08)`; floating sheets
  `0 24px–30px 60px–80px rgba(26,25,22,0.24–0.32)`; rail/site `0 10px 34px rgba(26,25,22,0.07)`.
- Toggles: 36×21px track, 16px knob, on = `accent-interactive`.
- Sliders: 5px track `#EDEAE3`, filled portion `accent-interactive`, 15px white knob with
  `1px #C9C4BA` border.

### Responsive breakpoints (canvas widths)
`L0` 390px (mobile) · `L1` 600px · `L2` 834px · `L3` 1040px (default) · `L4` 100% (wide).

---

## App Chrome — Top Bar
Height 56px, white, `border-bottom: 1px solid #E0DDD6`. Left→right:
- **Hamburger** (opens pages/structure navigator).
- **Site identity:** olive dot · `nocms.github.io` (mono) · `/` · page pill **Home ▾** (`#F4F2ED`).
- **Spacer.**
- **Breakpoint segmented** `L0 L1 L2 L3 L4` (one active).
- **Appearance toggle:** 26px circle split half-light/half-dark.
- **Divider.**
- **Save status:** amber dot (with soft halo) + "Unsaved edits" + "Reset" (slate link). Only when unsaved.
- **Publish button** — see Publish flow for the 4 states.
- **Account avatar:** 30px gradient circle (olive→slate), initial "A".

---

## Screens / Views

> Each editor screen = the same chrome + greige canvas (the **real rendered site**) + a 330px
> right rail. The canvas is never a separate "preview" — editing is in place on the live render.

### 1. Editor — default page view
- **Layout:** top bar (56px) / body row → canvas (flex, greige, the site centered on a white
  surface at the active breakpoint) + right rail (330px).
- **Right rail (page properties):** header "Home · Page · /"; `TITLE` input; `DESCRIPTION`
  textarea; divider; **Design & brand** entry row (3 mini swatches + "Tokens that restyle the
  whole site" + chevron); a full-width **Add a section** button in `accent-interactive`.
- **Hover affordance** (shown on the feature grid): 1.5px slate outline + a mono section label
  pill (`FEATURE GRID`) top-left.

### 2. Editor — section selected (block properties)
- **Canvas:** the Hero gets a 2px `accent-interactive` selection outline + a floating dark
  toolbar (move up / move down / divider / duplicate / delete / divider / settings).
- **Right rail (block properties, derived from the block schema):** header "Hero · SECTION · CORE";
  controls in order — `EYEBROW` (text), `TITLE` (text, focused: slate border + focus ring),
  `SUBTITLE` (textarea), `ALIGNMENT` (segmented Left/**Center**/Right), `ACTIONS` (**list**: two
  reorderable rows "How it works · GHOST" and "Create my site · PRIMARY", each with drag handle +
  chevron, plus a dashed "Add item"), `IMAGE` (thumbnail + name + "1600 × 900" + "Replace"),
  a `LAYOUT` **group** (a **range** "Vertical padding 96px" + a **boolean** "Full-bleed background" on),
  and an **Advanced** disclosure (collapsed).

### 3. Editor — inline text editing
- The hero headline is edited in place in the real Lora typeface: part of the headline
  ("Own it forever.") is selection-highlighted (`rgba(61,90,152,0.22)` + 1px slate ring), a 2px
  blinking slate caret follows, and a small dark format toolbar (B / I / link / H) floats above.
  Rail stays in block mode.

### 4. Design & brand — expanded, mid-restyle
- The Design & brand entry expands into a token panel **in the rail**: `TEMPLATE` segmented
  (Editorial/Studio), `PRIMARY COLOR` swatch row (active ringed), `APPEARANCE` segmented
  (Light/Dark), `CORNER RADIUS` slider with px readout, and quiet "Typography scale" / "Spacing
  density" rows ("more tokens"). In this frame a **non-default** primary (slate `#3D5A98`) and an
  18px radius are active — and **the whole canvas reflects it live** (site buttons slate, corners
  rounder). No spinner: token changes are instant/runtime.

### 5. Component catalog — insert sheet (browse)  *(flagship)*
- Centered overlay over the dimmed canvas (dim = `rgba(26,25,22,0.5)`). 900px white sheet,
  16px radius. Header: "Insert a section" + close; big search field ("Search sections by name,
  description, or tag…"); **library chips** `LIBRARY · All · Core · Studio Pack` (All active = dark
  pill — the *only* place a pack drives layout, and it's optional). Body: **grouped by intent**
  under mono category headers (Headers & heroes · Features · Social proof · Pricing & plans ·
  Forms & footers), each a 3-col grid of **large cards**. Each card = a rendered mini-preview
  (real-looking miniature in palette) + name + one-line description + a quiet line-glyph icon +
  a quiet library badge (`Core` grey / pack = slate). Hover lifts the card and reveals an
  **Insert** pill over the preview.

### 6a. Catalog — searching "pricing"
- Same sheet, search field shows the query + a `2 results` count; results render under their
  intent categories (Pricing & plans → Pricing table; Content → Pricing FAQ) — i.e. search spans
  libraries/categories, not folders.

### 6b. Catalog — no results
- Centered empty state: muted search glyph, `No sections match "<query>"`, a calm helper line,
  and "Clear search" / "Browse all" actions.

### 7. Inline + insert popover
- Hovering the gap between two sections reveals a 2px slate insert line + a 26px slate `+`
  circle; clicking opens a compact **344px** searchable popover (same design language): a search
  field + a short `SUGGESTED` list (Testimonial / Feature grid / Logo cloud, each with icon +
  badge) + a "Browse all sections" footer.

### 8. Pages & structure navigator
- Slides in from the left (316px white panel, right shadow). `PAGES` list (Home active/marked +
  About/Work/Journal/Contact, each with drag handle + page icon; a `+`), divider, `SECTIONS · HOME`
  outline (Hero selected/highlighted, Logo cloud, Feature grid, Testimonial, Footer — each with
  drag handle + glyph). Selecting an outline row selects it on canvas; drag to reorder.

### 9. Publish — popover & button states
- **Async, discrete.** Popover anchored under the Publish button: "Publish to GitHub Pages" +
  "Edits are saved instantly. Publishing pushes them live in a background job." + a `CHANGES SINCE
  LAST PUBLISH` list (amber dots: "3 sections edited", "Brand color changed"; olive dot: "1 section
  added · Testimonial") + a `Publish now` primary button + "Last deploy · 2d ago" / "View live ↗".
- **Button state strip** (4 states): `Publish` (rust) → `Publishing…` (white + spinner) →
  `Published · view live` (olive tint) → `Failed — retry` (red tint). Unsaved (amber, instant) vs
  published (settled) must read as distinct.

### 10. Media picker
- 760px modal: "Choose an image · Committed to your repo · /assets" + `Upload` + close; a
  `RECENTLY USED` row (4 thumbs); `ALL MEDIA · 11` grid (4-col) with one **selected** (2px slate
  ring + check, filename chip) and an "Upload" dashed tile; footer Cancel / Insert image.
  Placeholder thumbnails use 45° repeating-stripe backgrounds.

### 11. Sign-in gate (first run)
- The site sits blurred behind a greige scrim; a centered 430px card: noCMS mark, "Sign in to
  edit this site", "You own nocms.github.io. Sign in with GitHub to make changes — editing is
  instant, publishing is one click.", a dark **Continue with GitHub** button (GitHub glyph), and a
  mono footnote `OPEN SOURCE · MIT · YOU OWN THE REPO FOREVER`.

### 12. Library manager
- A distinct screen (chrome with "Back to editor"), centered 760px column: "Libraries · Manage the
  section libraries installed in this site" + `Add a library`. Cards for **Core** (v2.4.0, Verified,
  24 blocks, "Built in" — no remove) and **Studio Pack** (v1.1.0, Verified, 9 blocks, "Remove"),
  plus an "Add a library from a Git URL or the registry" dashed tile. Managing installs ≠ inserting.

### 13. Responsive — narrow breakpoint (L0)
- Same editor; canvas resizes the live site to 390px (centered in greige, condensed type), Hero
  selected, rail in block mode. Demonstrates the breakpoint toggle driving the real render.

### 14. Component spec — control kinds & card states *(bonus)*
- A reference board: every control kind rendered (text, textarea, number, range, boolean, select,
  color, image, url, date, reference, list, group, advanced) each under its mono label; plus the
  catalog card in default / hover-insert / selected states.

---

## Interactions & Behavior
- **What you preview is what you publish** — no preview-mode toggle; the canvas is the live render.
- **Instant edit, async publish** — every text/style/token edit is immediate, local, free, and
  marks state "Unsaved edits" (amber). Publish is a discrete background job with its own status
  (idle → publishing → published / failed).
- **Tokens restyle live** — changing a brand color, appearance, or radius re-renders the entire
  canvas at runtime with **no spinner, no build step**.
- **Selection drives the rail** — selecting a section swaps the rail from page-properties to that
  block's schema-derived controls; deselect returns to page properties.
- **Inline editing** — clicking a heading/paragraph makes it contentEditable in place in the real
  typeface (caret, text selection, floating format bar).
- **Insert** — `+ Add a section` opens the full catalog sheet; the inline `+` between sections
  opens the compact popover. Inserting a section places it on the canvas, selected, with its props
  in the rail.
- **Hover** — sections show a subtle slate outline + mono label + drag handle; the gap between
  sections reveals the inline `+`.
- **Search** — searches name/description/category/tags across all installed libraries at once,
  grouped by intent; library chips are an optional filter, never the primary navigation.
- **Responsive** — breakpoint toggles resize the canvas; rails persist.
- **Single owner** — the authenticated repo owner editing their own site. No multi-user cursors,
  comments, or collaboration UI.

## State Management
Suggested state shape for the recreation:
- `page`: `{ id, title, description, route, sections: Section[] }`; `pages: Page[]`.
- `selection`: `null | { type: 'page' | 'section' | 'element', id }` → drives rail mode.
- `hover`: `null | sectionId` → drives hover affordance + inline `+`.
- `editingTextRef`: which text node is contentEditable.
- `tokens`: `{ template, primaryColor, appearance, radius, typographyScale, spacingDensity }`
  — applied as CSS custom properties on the canvas root so changes are instant/runtime.
- `breakpoint`: `'L0'..'L4'`.
- `dirty`: boolean (unsaved edits) + a `changeset` summarizing changes since last publish.
- `publish`: `{ status: 'idle' | 'publishing' | 'published' | 'error', lastDeployAt, liveUrl }`
  (async job; poll/subscribe for completion).
- `overlay`: `null | 'catalog' | 'inline-insert' | 'navigator' | 'publish' | 'media'`.
- `libraries`: installed packs; `catalog`: blocks grouped by intent, each with
  `{ kind, displayName, description, category, tags, library, schema }`. Rail controls are
  generated from each block's `schema` (the control kinds in screen 14).

## Assets
No raster assets are required. Everything is HTML/CSS:
- **Fonts:** Lora, Inter, IBM Plex Mono (Google Fonts). Use your codebase's font-loading approach.
- **Icons:** simple inline line-glyph SVGs (1.4–1.6 stroke) — replace with your icon set (e.g.
  Lucide/Phosphor) matching the quiet line style. The GitHub mark is the only brand glyph.
- **Image placeholders:** 45° repeating-linear-gradient stripes stand in for user media — swap for
  real `<img>`/media components.

## Files
Design references in this bundle (open in a browser to view; they render via the included
`support.js` runtime — do not port the runtime):
- `noCMS Editor.dc.html` — the full board: all 14 frames laid out on one canvas.
- `Editor.dc.html` — the editor shell (chrome + live canvas + right rail), prop-driven.
- `CatalogSheet.dc.html` — the insert sheet (browse / search / empty).
- `CatalogCard.dc.html` — a single catalog card (9 preview kinds, default/hover).
- `support.js` — the reference runtime ONLY (not part of the design; do not reimplement).

Each `.dc.html` is a template + a small `Component` logic class whose `renderVals()` returns the
view inputs — read these for exact values; they translate directly to props/state in your stack.
