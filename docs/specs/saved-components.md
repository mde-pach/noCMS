# Spec — Saved Components (no-code symbol authoring)

How a non-developer **builds** a component, not just **uses** one. *Using* a component is placing a
brick and filling its props (content — already works). *Building* is authoring a reusable definition
in the library. This spec covers the no-code building path: **specialize** (lock props on one brick)
and **compose** (arrange several bricks into a new named unit). Both are **one gesture** — *select on
the canvas → "Save as component" → prune what stays editable* — differing only in selection size.
Authoring genuinely new *rendering behavior* (a "new primitive") is out of scope: that is the
plugin/sandbox path (`plugins.md`), or a future AI-assisted track that sits *on top of* compose as
an accelerator (describe → assemble from your bricks → prune → save), never a code generator.

> **North star:** a creator turns an arrangement they like into their own opinionated component and
> reuses it like any curated brick — same catalog, same controls, no code, no build.

## Two concepts (do not conflate)

- **Instance / usage** — a placed component + its prop values. Content; lives in a page's MDX.
- **Definition / component** — a reusable unit in the library; instances reference it. Building one
  is the new act this spec adds. An instance depends on the definition's **interface**, never its
  **implementation** — that boundary is what makes it a component rather than a snippet.

## The model — a symbol with an encapsulated implementation

A saved component is a **symbol**, authored visually, obeying ordinary component encapsulation.

- **Master** (in the site pack via `createRegistry`) owns the internal structure *and* the interface
  (exposed scalar props **and** child slots, + their defaults). Stored as text — MDX/JSX of known components — and
  loaded into the registry at **runtime**, so authoring needs no build (invariant #3). It rides the
  same pack/manifest seam as a plugin-contributed component (`component-packs.md`): manifest +
  structure template, differing only in trust and authorship.
- **Instance** carries the **exposed interface, written explicit inline**, tagged
  `data-symbol="Name@v"` — a source-level annotation read from the MDX AST, not necessarily emitted
  to HTML. It does **not** carry the implementation (encapsulation).
- **Exposed values are seeds** — copied at insert, then frozen per instance. Changing a master
  default only seeds *future* inserts; existing instances keep their copy.
- **Implementation is by reference** — edit it in one place; instances re-render fresh. A saved
  component is therefore a real dependency: delete the master and instances lose their internals
  (they retain their explicit interface).
- **Auto-sync fires only on interface changes** (rename / add / remove an exposed prop), rewriting
  instances to the new contract. Everything else is local or encapsulated.
- **Detach** = drop the `data-symbol` tag; the instance becomes plain owned blocks.
- **Slots are interface, not just scalars.** A component's interface = exposed scalar props **+
  exposed child regions** (`BlockDef.slots`). A slot's contents are per-instance, materialized
  inline, and preserved across auto-sync exactly like exposed values — so saved *containers* ("our
  Card", "our Section with our padding/border") are possible, not only fill-in-the-blank presets.
  This is the line between a real layout component and a section template (`component-library.md`).
- **A list is just children in a slot — no "repeater" primitive.** A card row / team grid / nav is
  an exposed slot filled with N child blocks; add / remove / reorder is ordinary block editing, each
  item edited via its own props panel. The uniform block tree with container slots (D15) already
  expresses "multiple children." A per-slot shape constraint ("accepts only `Card`") is a possible
  future slot property, not a separate concept — deferred, not needed for v1.

### What each edit costs

| Edit | Effect on instances | Cost |
|---|---|---|
| Internal implementation | none — encapsulated in the master | 1 file |
| Exposed **default** value | none — seeds only future inserts | 1 file |
| Exposed value on **one** instance | that page | tiny |
| Rename / add / remove an exposed prop | all rewritten to the new contract | wide commit (auto-sync) |

Sync runs live in the editor session (runtime), persists as a branch-per-session commit
(invariant #7), and publishes async — never a build step. **Guardrail:** the editor must not let you
hand-edit the locked/internal part of an attached instance (steer to *edit master* or *detach*),
because auto-sync would silently clobber it.

## Compose: opt-out demotion

Saving a multi-brick selection exposes **everything by default**; the author **prunes** down to a
small opinionated surface and locks the rest. Obviously-structural props (layout, direction)
auto-lock so pruning is fast. The pruning *is* the opinionation. (Specialize is the degenerate case:
a selection of one.)

## Open — details

- **Promoted-control rename / group / order**; **exposed-value migration** when an interface change
  renames or removes a prop.
- Catalog placement of the site's library pack; naming / collision rules vs the curated `core` pack.
