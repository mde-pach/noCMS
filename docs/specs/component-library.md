# Spec — Component & Section Library (Phase 1 content)

The curated building blocks a creator composes with. This is the **biggest product lever** for the
Figma-like feel: the research (`docs/research/compose-ux-patterns.md`) is unambiguous that a
*small, opinionated, excellent* set beats a large mediocre one — a large gallery of mediocre
sections is what pushed Squarespace's serious users to third-party packs. Today `@nocms/components`
ships 16 primitives; this spec defines the target catalog and the rules every brick obeys.

> **North star:** a creator never faces a blank canvas or a wall of 200 widgets. They pick a
> *finished-looking section* by what it's *for* ("a pricing section"), then edit it down. The set
> is small enough to be excellent everywhere and curated enough that anything you assemble looks
> intentional.

## Two tiers

- **Primitives** — the vocabulary: layout, content, interactive, embed. Small, composable, each
  excellent. This is what L1 inserts and what sections are built from.
- **Sections** — page-role compositions of primitives (Hero, Pricing, FAQ…). A section is *just a
  saved composition of primitives* — no second mechanism, no separate runtime. Insert-then-own:
  the inserted section is plain MDX/JSX in the user's file, seeded with real content, with no
  hidden link back to a template.

## Rules every brick obeys (non-negotiable)

1. **Typed valibot props (D9).** Each component declares a valibot props schema; its prop type is
   `v.InferOutput`. Controls are *derived by introspection* — never hand-declared. Shape props for
   good controls: use meta-types (`v.metadata({ control })`) so `color`→token-bound swatch,
   `image`→media picker, `url`→link field, `richtext`→inline prose, `range`→slider.
2. **Token-only styling (invariants #3, #5).** No hardcoded colors, spacing, type sizes — every
   visual value resolves to a token CSS variable, so runtime theming restyles without a rebuild and
   colors set in a panel are *token references*, not raw hex.
3. **Island only if interactive (invariant #1).** Static components render to HTML and never
   hydrate; only genuinely interactive ones (`island: true`) ship JS. Keeps the reader bundle tiny
   and preserves preview === publish.
4. **Responsive by construction (no absolute positioning).** Layout flows through layout primitives.
   Responsiveness is expressed as *constrained* props (e.g. `Grid` columns per breakpoint), never
   free-dragged coordinates — the anti-pattern the research flagged in Wix Studio.
5. **Variants are props, not new components.** A `Hero` has `variant: 'left' | 'center' | 'split'`
   rather than three Hero components — fewer bricks, and the variant is a discoverable control.

## Primitive catalog (target)

Legend: **I** = island (hydrates). Bold = already in the registry today.

### Layout — structure the page
Layout components are **blocks with slots** (D15): they hold child blocks the host owns and the user
edits. They are blocks like any other — same insert/select/props flow — which is what makes "layout
as a block" and plugin-contributed containers work. Slots are freeform by default (optionally typed
later); composition is deep but always through these typed containers, never free positioning.

| Component | I | Key props (control) | Notes |
|---|---|---|---|
| **Section** | | `background` (color/token), `padding` (range), `width` (select) | The page's top-level band; sections are the primary reorder/insert unit. |
| **Container** | | `width` (select: prose/normal/wide/full) | Centers + constrains content width. |
| **Grid** | | `columns` (range, per-breakpoint), `gap` (range) | Constrained responsive grid; no free placement. |
| **Stack** | | `direction` (select), `gap` (range), `align` (select) | Vertical/horizontal flow. |
| **Divider** | | `spacing` (range) | |
| Spacer | | `size` (range) | Explicit vertical rhythm where Stack gap isn't enough. |

### Content — the substance
| Component | I | Key props (control) | Notes |
|---|---|---|---|
| Heading | | `level` (select 1–6), text (richtext inline) | Maps to mdast heading; inline-edited (L0). |
| Text / Prose | | body (richtext inline) | The default paragraph/rich-text block. |
| **Image** | | `src` (image picker), `alt` (string), `fit` (select) | Upload → resize-before-commit (Phase 4). |
| **Badge** | | `label`, `tone` (select) | |
| **Button** | | `label`, `href` (url), `variant` (select), `size` (select) | |
| List | | `items` (array), `ordered` (toggle) | |
| Icon | | `name` (select from set), `size` (range) | Curated icon set, token-colored. |
| Embed | | `url` (url), `kind` (auto/video/map…) | The embed-by-URL brick for video & large media (decision 2 in VISION). |

### Interactive — islands
| Component | I | Key props (control) | Notes |
|---|---|---|---|
| **Form** | I | `fields`, `action` (url, optional) | Visual primitive; submission backend deferred to self-host (decision 1). |
| **Input** / **Textarea** / **Select** | I | label, name, placeholder, required | Form fields. |
| Accordion | I | `items` (array of {q, a}) | Powers the FAQ section. |
| Tabs | I | `tabs` (array) | |
| **Counter** | I | `start` (number) | Already an island; the canonical "is hydration wired" smoke test. |

## Section catalog (target — page-role)

A *small, excellent* set covering the real pages people build. Each ships **real seed content** and
1–3 variants (props, not forks). Thumbnails render free through the one renderer.

| Section | Composed of | Variants | Seed |
|---|---|---|---|
| **Header / Nav** | Container + Stack + Button + links | left / centered / split | site name + 3–4 links + CTA |
| **Hero** | Section + Container + Heading + Text + Button(s) + Image | left / center / split-image | headline + subhead + 2 CTAs |
| **Features** | Section + Grid + (Icon + Heading + Text)×N | 2/3/4-up · with/without icons | 3 feature cards |
| **Logos / Social proof** | Section + Grid + Image | grayscale / color | 5 placeholder logos |
| **Pricing** | Section + Grid + (Card: Heading + List + Button)×N | 2/3 tiers · highlight one | 3 tiers |
| **Testimonials** | Section + Grid/Stack + (quote + avatar + name) | grid / single-spotlight | 3 quotes |
| **FAQ** | Section + Accordion | — | 4 Q&As |
| **Stats** | Section + Grid + (big-number + label) | 3/4-up | 3 stats |
| **Team** | Section + Grid + (Image + name + role) | — | 3 members |
| **Gallery** | Section + Grid + Image | masonry / uniform | 6 images |
| **CTA** | Section + Container + Heading + Button | banner / boxed | headline + 1 CTA |
| **Contact** | Section + Form | with/without map embed | name/email/message form |
| **Footer** | Container + Grid + links + Text | columns / minimal | nav columns + copyright |

That's ~13 sections and ~20 primitives — deliberately bounded. New sections are added by *saving a
composition*, so the set grows without engineering and (later) accepts plugin-contributed sections
through the same path.

## Tokens-as-bricks (link to Phase 3)

The library depends on a **named token contract** so theming restyles every brick coherently:
- **Color roles** (not raw palette): `bg`, `surface`, `text`, `muted`, `primary`, `on-primary`,
  `border`, `accent`. Component `color` controls bind to these roles, so a theme swap is global.
- **Scales**: spacing, type size, radius, shadow — each a small token ramp components reference.

A component that reaches outside this contract for a hardcoded value is a bug. Phase 3 (Design)
specs the panels that edit these; this spec only fixes the *contract the components consume*.

## What's deliberately out (v1)

- **Data-bound components** (a "latest posts" list pulling from a collection) — that's L3/Phase 2 +
  `@nocms/derive`; the *island* that reads `feed.json`/`search.json` is a Phase 6 concern.
- **Heavy interactive** (autoplay carousels, modals, multi-step wizards) — complexity beyond the
  "standard-user-proof" bar; revisit as plugins.
- **Commerce / checkout** — out of scope (Pages ToS forbids it; platform-facts).
- **Custom-coded components** — that's the L4 plugin path (`@nocms/sandbox`), not the curated set.

## Anti-patterns to avoid

1. **A big mediocre catalog** — the core failure mode; curate ruthlessly.
2. **Lorem-grey seed content** — sections must look finished on insert.
3. **Hardcoded visual values** — breaks runtime theming and the token contract.
4. **A component per variant** — explodes the set; use a `variant` prop.
5. **Hydrating static components** — bloats the reader bundle; island only when interactive.
6. **Hand-declared control metadata** — violates D9; derive from the schema.
7. **Free/absolute positioning props** — breaks responsive; constrain layout to primitives.

## Open questions → Claude Design exploration targets

- The actual **visual design** of each section + its variants (this is the prime Claude Design job —
  explore directions, then `/design-sync` into conformant components per the VISION design workflow).
- The **variant set** per section — which 1–3 variants earn their keep.
- **Seed-content tone** — copy that reads as a real starting point, not filler.
- The **icon set** — which curated icons, and the meta-type control for picking one.
- The exact **token-role names** (coordinate with Phase 3).

## Relationship to existing seams

- `@nocms/components` — the registry this catalog populates (island flags per the rules above).
- `@nocms/props-discovery` — derives each component's controls from its valibot schema (D9).
- `@nocms/renderer` — renders the tree and hydrates only islands (invariant #1).
- `@nocms/tokens` — the token contract every component's styling resolves to.
- `@nocms/editor` — the insert palette + section library browser specced in `authoring-shell.md`.
