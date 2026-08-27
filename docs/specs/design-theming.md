# Spec — Design & Theming (Phase 3)

The L2 "Design" altitude: how a brand owner makes the site *theirs* — colors, type, spacing, dark
mode, responsive behaviour — entirely at runtime, with **no rebuild** (invariant #3, the hard
rule). Grounded in `@nocms/tokens` (flat one-token-per-line source → CSS custom properties; DTCG
generated for interop) and the existing `tokens-panel.tsx` in `@nocms/editor`. Builds directly on
the token-role contract defined in `component-library.md` ("Tokens-as-bricks").

> **North star:** changing one brick — a color role, a spacing step — restyles the *whole* site
> instantly, like dragging a slider. The user edits *meaning* ("primary", "surface"), never raw hex
> scattered across components, and never waits for a build.

## 0. The model in one breath

The flat token file is the **single source of truth** (line-diffable, invariant #5). It compiles to
CSS custom properties via `toCssVariables`; components consume only those variables (never literals).
So a token edit is a CSS-variable swap — the page restyles with zero rebuild and zero re-render of
the tree (invariant #3). DTCG is *generated* from the flat source for interop, never the reverse.

## 1. Tokens-as-bricks panel

The panel edits the flat token file visually. It is organized by the **role contract**, not by raw
palette, so a non-expert edits intent:

- **Color roles:** `bg`, `surface`, `text`, `muted`, `primary`, `on-primary`, `border`, `accent`.
  Each is a single swatch; editing it recolors every component bound to that role. A raw palette
  (e.g. `blue.500`) exists only *behind* roles as optional referenced values — roles are what the
  panel surfaces.
- **Ramps:** spacing, type-size, radius, shadow — each a small ordered scale (e.g. `space.1…6`,
  `text.sm…2xl`). The panel shows a ramp as a compact stepper, not 12 free fields.
- **Live binding:** every control writes a `Token` and re-emits CSS variables on the spot
  (`cssVarName` gives the deterministic `--token-name`). The canvas reflects it the same frame.

The panel never exposes a token that no component consumes — the role contract keeps the surface
small and every brick meaningful (the same "small, opinionated set" discipline as the component
library).

## 2. Theme presets

A **theme preset is just a named set of token values** — nothing more. Switching a preset rewrites
the flat token file's values (roles + ramps) and re-emits CSS variables; the swap is instant and
rebuild-free. Ship a *small, excellent* set of starting themes (e.g. 4–6: a clean neutral, a warm
editorial, a bold high-contrast, a soft pastel), each a complete role+ramp assignment. Picking one
is the fastest L2 action — the design equivalent of the section library curing blank-canvas paralysis.
A preset is a starting point you then edit; it is *not* a locked skin (insert-then-own, same as
sections).

## 3. Dark mode

**Recommendation: one flat source, a parallel value per role, scoped CSS variables — not a second
file, not a second renderer.** A role token may carry an optional dark value, expressed in the flat
file with a mode qualifier so it stays one line-diffable source:

```
color.primary = #3b82f6
color.primary@dark = #60a5fa
```

`toCssVariables` compiles this to a base block and a scoped override:

```css
:root            { --color-primary: #3b82f6 }
[data-theme=dark]{ --color-primary: #60a5fa }
```

The root toggles `data-theme` (following `prefers-color-scheme` by default, with a user override),
so switching mode is a class flip — instant, runtime, no rebuild, no tree re-render. Only role
*colors* (and shadows) take dark variants; ramps for spacing/type/radius are mode-invariant. Roles
that omit a `@dark` value inherit the base, so dark mode is incremental — you tint what needs it.

*Cost (flagged):* this needs a small `@nocms/tokens` extension — `parseTokens` to accept the `@mode`
qualifier and `toCssVariables` to emit the scoped block. Bounded and additive.

## 4. Responsive controls

Layout is constrained primitives (no absolute positioning), so responsiveness is **a few structural
props that vary by breakpoint**, never free-dragged coordinates.

- **Breakpoint model — three, named, fixed:** `base` (mobile-first), `md` (tablet), `lg` (desktop).
  Base always applies; `md`/`lg` override upward. Kept to three so the mental model stays trivial.
- **Breakpoint-aware props (curated, not universal):** `Grid.columns`, `Stack.direction`, `gap`,
  block `visibility` (hide on mobile), and the type-size step. Everything else is breakpoint-invariant
  to avoid Wix-style per-pixel-per-breakpoint sprawl.
- **Storage:** a breakpoint-aware prop is an object literal in the JSX, e.g.
  `columns={{ base: 1, md: 2, lg: 3 }}` — still plain, line-diffable layout text (invariant #5).
- **Editing:** a breakpoint switcher in the canvas toolbar sets the active viewport; editing a
  breakpoint-aware control writes that breakpoint's value. The canvas previews at the chosen width.

## 5. DTCG interop / Figma round-trip

`toDtcg` exports the flat tokens as W3C DTCG for the design workflow — Tokens Studio / Claude Design
import the role+ramp set so explorations are brand-consistent from the first frame (the VISION design
workflow). **Direction is one-way by contract (invariant #5):** flat source is canonical, DTCG is
generated on demand (an export action, or a ② derive artifact). Importing DTCG → flat is an
*escape-hatch only*, treated as lossy manual reconciliation, never an automatic sync — so the design
tool can *seed* exploration but never silently become the source of truth.

## 6. Progressive disclosure

| Altitude | In Design terms | Trigger |
|---|---|---|
| **L0 Content** | (none — design is invisible here) | — |
| **L1 Compose** | per-component `color`/size props *bound to roles* | props panel |
| **L2 Design** | **role swatches, ramps, presets, dark mode, breakpoints** | inspector "Design" fold / tokens panel |
| **L3 Structure** | (design is global; structure is orthogonal) | — |
| **L4 Extend** | edit the flat token file as text; add raw palette values | "edit tokens as text" |

A creator never *has* to open L2 — a preset is one click. A brand owner lives in it. A developer
drops to the flat file. Same source underneath; you can always drop a layer, never forced up one.

## Anti-patterns to avoid

1. **Raw hex in components** — bypasses roles, breaks global theming; every value resolves to a token.
2. **Per-component theme overrides** — fragments the system; theming is global by role.
3. **Universal per-breakpoint props** — every prop responsive is Wix-style sprawl; curate the set.
4. **DTCG (or Figma) as source of truth** — reverses invariant #5; flat file is canonical.
5. **Rebuild on theme change** — violates invariant #3; theming is a CSS-variable swap only.
6. **Too many tokens/themes** — paralysis; the role contract + a handful of presets stay small.
7. **A second dark-mode renderer or duplicate tree** — dark mode is scoped CSS variables, one render.

## Open questions → Claude Design exploration targets

- The **token panel** layout — roles vs ramps, how a swatch row + ramp stepper read without clutter.
- The **preset gallery** — how many, their visual identities, thumbnail framing (rendered free
  through the one renderer).
- The exact **`@mode` syntax** for dark values in the flat file (confirm it stays clean + diffable).
- The **breakpoint switcher** affordance in the canvas toolbar and how breakpoint-aware controls
  signal "this value is per-viewport."
- The **role names** themselves — validate the 8-role contract is sufficient with real designs.

## Relationship to existing seams

- `@nocms/tokens` — `parseTokens` / `toCssVariables` / `cssVarName` / `toDtcg` / `formatTokens` and
  the `Token` type; needs the bounded `@mode` extension for dark mode (§3).
- `@nocms/editor` — `tokens-panel.tsx` is the L2 surface this spec fleshes out.
- `@nocms/components` — consume only role/ramp CSS variables (the contract in `component-library.md`).
- `@nocms/renderer` — applies CSS variables; one render, themes are variable swaps (invariant #1/#3).
- `@nocms/derive` — optional ② job to emit the DTCG export artifact for interop.
