# Implementation Tasks: noCMS In-Site Editor

A dependency-ordered backlog sized for an agentic dev session (Claude Code). Each ticket is
self-contained: scope, the reference frame in `noCMS Editor.dc.html`, and acceptance criteria.
Do them top-to-bottom — later tickets assume earlier ones exist. Treat the `.dc.html` files as
**visual references**; build in your codebase's framework and patterns (see README.md).

> **Workflow tip:** give the agent ONE ticket per turn, paste the relevant README section, and
> have it diff its output against the named frame. Commit after each ticket.

---

## Epic 0 — Foundation

### T0.1 — Design tokens
- Define the full token set from README → "Design Tokens" as CSS custom properties (or your
  theme system): colors, the brand swatch palette, type families (Lora / Inter / IBM Plex Mono),
  radii (10px default), shadow scale, segmented-control + toggle + slider specs.
- **Accent rule (enforce in code):** chrome accent = slate `#3D5A98` (Publish, Add a section,
  selection, active toggles, Insert). Terracotta `#B0542F` is ONLY for live-canvas site content
  and brand-token swatches. Consider lint/util helpers so the two never mix.
- **Done when:** a single source of truth exists; changing `--brand-primary` recolors site content
  without touching chrome.

### T0.2 — Primitives
- Build the shared UI atoms used everywhere: `MonoLabel`, `SegmentedControl`, `Toggle`, `Slider`
  (track + readout), `TextField`, `TextArea`, `Pill/Button` (primary-slate / ghost), `IconButton`,
  `SwatchRow`, `Badge` (Core / pack).
- **Reference:** frame 14 (control-kind gallery).
- **Done when:** each renders pixel-faithfully at the documented sizes/radii and can be composed.

---

## Epic 1 — Editor shell

### T1.1 — App chrome / top bar
- Top bar (56px): hamburger, site identity (`nocms.github.io` / page pill), breakpoint segmented
  `L0–L4`, appearance toggle, save-status (amber dot + "Unsaved edits" + Reset), Publish button,
  avatar.
- **Reference:** frames 1, 2. **Accent:** Publish is **slate**.
- **Done when:** layout matches; breakpoint + appearance toggles hold local state.

### T1.2 — Canvas host
- The greige canvas area that renders the **real site** on a white surface, centered, at the
  active breakpoint width (L0 390 / L1 600 / L2 834 / L3 1040 / L4 100%). Switching breakpoint
  visibly insets/narrows the surface within the shell.
- **Reference:** frames 1, 13 (L1 inset). **Done when:** the canvas is the live render (no separate
  preview mode) and resizes with the toggle.

### T1.3 — Site sections (sample content)
- Render the sample site as real components: site nav, Hero, Logo cloud, Feature grid (the README
  copy). These are the actual published components — preview = publish.
- **Done when:** the site renders identically to the canvas in frame 1 and reads token changes live.

### T1.4 — Right rail dock
- A **docked** panel: full-height from under the top bar to the viewport bottom, flush right,
  hairline left divider, white surface (no floating card, no greige beneath it). 330px.
- **Reference:** frames 1–4. **Done when:** rail is docked full-height in every editor screen.

---

## Epic 2 — Selection, editing & properties

### T2.1 — Hover & selection affordances
- Section hover: subtle slate outline + mono section label + drag handle. Selected: 2px slate
  outline + floating toolbar (up / down / duplicate / delete / settings). Gap-hover reveals the
  inline `+`.
- **Reference:** frames 1 (hover), 2 (selected). **Done when:** selection sets `selection` state
  and drives the rail.

### T2.2 — Page-properties rail
- Default rail: TITLE / DESCRIPTION fields, Design & brand entry row, full-width **Add a section**
  (slate). **Reference:** frame 1.

### T2.3 — Schema-driven block-properties rail
- On selection, render controls generated from the block's schema. Support every control kind:
  text, textarea, number, range, boolean, select, color, image, url, date, reference, **list**
  (add/remove/reorder), **group**, and an **Advanced** disclosure.
- **Reference:** frames 2 (Hero) + 14 (gallery). **Done when:** the Hero schema renders the exact
  controls shown and edits update canvas state instantly.

### T2.4 — Inline text editing
- Click a heading/paragraph → edit in place in the real typeface (caret, selection highlight,
  floating format bar B/I/link/H). **Reference:** frame 3.

---

## Epic 3 — Design & brand tokens

### T3.1 — Token panel
- Expandable Design & brand panel in the rail: Template segmented, Primary-color swatch row
  (active ringed), Appearance segmented, Corner-radius slider w/ px readout, quiet "more tokens"
  rows. **Reference:** frame 4.
- **Done when:** changing any token re-renders the whole canvas **instantly, no spinner/build**
  (apply via CSS custom properties on the canvas root). Non-default primary (slate) + 18px radius
  reproduce frame 4.

---

## Epic 4 — Component catalog

### T4.1 — Catalog data + card
- Model blocks as `{ kind, displayName, description, category, tags, library, schema }`. Build the
  `CatalogCard`: rendered mini-preview + distinct line-glyph icon + name + description + quiet
  library badge. **No checkbox.** Single click inserts; hover reveals a slate **Insert** pill.
- **Reference:** frames 5, 14. **Done when:** all 9 preview kinds render; no multi-select UI.

### T4.2 — Insert sheet (modal)
- Centered modal over the dimmed canvas (evenly dimmed both sides), search-first, library filter
  chips (All default), intent-grouped categories, big breathing cards. Includes search-results and
  no-results states.
- **Reference:** frames 5, 6a, 6b. **Done when:** search filters across libraries by intent;
  inserting places the section on canvas, selected, with its props in the rail.

### T4.3 — Inline insert popover
- Compact 344px searchable popover anchored at an inline `+` between sections (search + suggested
  list + "Browse all"). **Reference:** frame 7.

---

## Epic 5 — Navigation, publish, media

### T5.1 — Pages & structure navigator
- Left slide-in (316px): Pages list (current marked; create/rename/delete/reorder) + section
  outline for the current page (select syncs to canvas; drag to reorder). **Reference:** frame 8.

### T5.2 — Publish flow (async)
- Publish popover (changeset summary + async note + Publish now + view live) and the 4 button
  states (idle / publishing / published / failed-retry). Publishing kicks a background job and
  polls/subscribes; unsaved (amber, instant) vs published (settled) read as distinct.
- **Reference:** frame 9. **Accent:** all slate (publish is chrome).

### T5.3 — Media picker
- Modal: recently-used row + media grid (one selected w/ slate ring + check) + upload tile +
  Cancel/Insert. Selecting commits into the repo `/assets`. Opens from any `image` control.
- **Reference:** frame 10.

---

## Epic 6 — Auth & libraries

### T6.1 — Sign-in gate
- First-run gate over the blurred site: noCMS mark, copy, **Continue with GitHub** (dark), MIT
  footnote. Wire the owner's GitHub OAuth. **Reference:** frame 11.

### T6.2 — Library manager
- Distinct screen: installed libraries (Core built-in; packs removable) with version, verified
  badge, block count, description; "Add a library" from Git URL/registry. Managing ≠ inserting.
- **Reference:** frame 12.

---

## Epic 7 — Responsive & polish

### T7.1 — Responsive editor
- Verify the canvas insets/narrows across L0–L4; decide how the rails adapt at the narrowest
  widths. **Reference:** frame 13 (L1).

### T7.2 — Single-owner constraints
- Confirm NO collaboration UI (cursors/comments), NO separate preview mode, NO e-commerce/checkout,
  pricing blocks display-only. Keep mono micro-labels and 10px radius throughout.

---

### Suggested order
T0.1 → T0.2 → T1.1 → T1.2 → T1.3 → T1.4 → T2.1 → T2.2 → T2.3 → T2.4 → T3.1 → T4.1 → T4.2 →
T4.3 → T5.1 → T5.2 → T5.3 → T6.1 → T6.2 → T7.1 → T7.2.
