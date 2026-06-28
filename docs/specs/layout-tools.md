# Layout tools — auto-layout & the layout inspector

D15 settled *what the tree allows*: layout lives only in typed container blocks with slots, never
absolute positioning. This spec defines *how a non-developer sets that layout up* — the UX layer
that was missing. The model is Figma's **auto-layout**: a container whose children flow under a
small set of constrained, token-bound rules. We expose that model, not raw CSS flex/grid.

## The Frame (one auto-layout container)

`Stack` and `Grid` collapse into one user-facing primitive, **Frame**, with a `direction` mode:

| mode | behaviour | CSS |
|------|-----------|-----|
| **row** | children flow horizontally | `display:flex; flex-direction:row` |
| **column** | children flow vertically (the common case) | `display:flex; flex-direction:column` |
| **grid** | children flow into a reflowing grid | `display:grid` |

One container, one inspector, one thing for the user to learn — switching `direction` switches
behaviour, the way Figma's auto-layout does. `Section` (semantic full-width band + `tone`,
`padding`) and `Container` (`width` constraint) stay as-is; they are *where* content sits, Frame is
*how* it arranges. `Stack`/`Grid` remain valid block names that deserialize to Frame modes, so
existing content and D15's tree are unaffected.

## The layout inspector

Layout props render as a single **visual control group**, not a stack of generic sliders — a new
`control: "layout"` meta-type the props panel renders specially:

- **direction** — segmented row / column / grid
- **gap** — token-bound (`space` ramp), as a stepper or slider with readout
- **padding** — token-bound, per-side optional
- **align** — a 3×3 matrix (cross-axis × main-axis), the Figma alignment picker
- **distribute** — start / center / end / space-between / space-around (main-axis distribution)
- **wrap** — on/off (row & column modes)
- **columns** — range, **grid mode only**

The group is purely a *renderer* over schema-derived values; it reads and writes the same props
introspected from the Frame's valibot schema (D9). No annotation DSL, no second source.

## Per-child sizing (the Figma subset)

When a child of a Frame is selected, its sizing shows in the child's own panel — the tasteful
subset, **not** raw flex:

- **width / height** — `Fill` (grow to container) · `Hug` (shrink to content) · `Fixed` (a token or
  value)
- **align-self** — override the Frame's cross-axis alignment for this one child

This covers ~95% of real layouts and stays responsive-safe. We deliberately do **not** expose
`flex-grow`/`flex-shrink`/`flex-basis`/`order`/`z-index` — they invite broken, non-responsive
layouts and read as a dev tool, not a builder.

## Responsive — smart by default, override on demand

The default must be responsive *without the user doing anything*:

- **grid** mode reflows automatically (`repeat(auto-fit, minmax(<min>, 1fr))`) so a "4-up" grid
  becomes 1-up on a phone with no per-breakpoint authoring.
- **row** mode `wrap`s rather than overflowing.

Power is opt-in: a layout prop can be overridden **per breakpoint** through a breakpoint switcher
that appears only when the user opens "override per screen". Overrides serialize as the existing
per-breakpoint shape the tokens layer already supports (`Grid.columns` per breakpoint is already in
the catalog spec). Single value is the norm; per-breakpoint is the escape hatch.

## Drag-to-arrange

The inspector sets *rules*; dragging sets *order and membership*. Blocks can be dragged to reorder
within a slot and to move between slots, with drop targets **constrained to legal slots** (D15's
typed-slot seam). No free drop onto pixels — a drag only ever resolves to "before/after sibling N
in slot S". This is the gesture layer over the same uniform tree; it commits as a normal tree edit
(one undo step).

## The seam (no new machinery)

```
Frame valibot schema  ──introspect (D9)──▶  control: "layout" descriptor
                                                   │
                                          props-panel renderer  ──writes──▶  same props
```

- One renderer, one tree (invariant #1): Frame is a normal block; the inspector and DnD are host-side
  UI over the existing canvas. No second renderer, no JSON layout tree (#5).
- Token-bound (#3): `gap`/`padding` are `space`-ramp values → runtime CSS variables, never a rebuild.
- Schema-derived (#10): the inspector is a control kind like any other; a plugin container that
  declares `control: "layout"` gets the same inspector with zero editor changes.

## Non-goals

- No absolute / pixel positioning, no overlap/stacking, no `z-index` ladder.
- No raw flex item props (`grow`/`shrink`/`basis`/`order`).
- No bespoke per-component layout UI — every container uses the one `layout` control group.
