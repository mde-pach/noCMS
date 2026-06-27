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
- **Instance** is an ordinary **component reference by name** (`<OurHero heading="…"/>`) carrying its
  **exposed interface explicit inline**. Because a saved component is a *registered block*, instances
  flow through the existing catalog / insert / props-panel / renderer with no special handling. The
  link *is* the element name; an optional `@version` marker (e.g. a `data-symbol` attribute read from
  the MDX AST, not necessarily emitted to HTML) lets the editor spot instances on an older interface
  for migration. The instance does **not** carry the implementation (encapsulation).
- **Exposed values are seeds** — copied at insert, then frozen per instance. Changing a master
  default only seeds *future* inserts; existing instances keep their copy.
- **Implementation is by reference** — edit it in one place; instances re-render fresh. A saved
  component is therefore a real dependency: delete the master and instances lose their internals
  (they retain their explicit interface).
- **Auto-sync fires only on interface changes** (rename / add / remove an exposed prop), rewriting
  instances to the new contract. Everything else is local or encapsulated.
- **Detach** = expand the implementation inline as plain blocks and drop the reference; the instance
  becomes plain owned content.
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

## Build plan

Grounded in the current code (editor block model, the pack/manifest seam, the GitHub client). The
design lands on seams that already exist: a saved component is the **owner-authored, in-process twin
of a sandboxed plugin component** — a `BlockDef` built from *data* (pre-derived controls + structure)
rather than a schema, rendered through the **one renderer** (not an iframe). The two genuinely new
pieces are a **runtime definition→pack loader** and the **"Save as component" authoring flow**.

### Exists vs. new

| Piece | Exists today | New work |
|---|---|---|
| Instance = component reference | `blockFromManifest`, `renderToHtml` (renderer does no prop filtering) | none |
| Catalog from manifests | `registryManifest` → `catalog.tsx` | none |
| Edit exposed props | props panel via `controlsOf` + `get/setProp` | hide locked controls |
| **Lock / expose** | `ControlDescriptor` + panel visibility (`showIf`) | add `symbolMode` (or `controlOverrides` on `BlockDef`), applied in `controlsOf` |
| Runtime registry, all 4 surfaces | `createRegistry(core, sitePack)` | a **loader** that builds a pack from stored definitions (twin of `createComponentRegistrar`) |
| Render the implementation | the one renderer | a **synthesized component**: substitute exposed props + slot children into the stored subtree |
| Wide-commit sync | `GitHubClient.commit(repo, msg, files[])` = one GraphQL call, all files | a find-by-name + rewrite pass |
| Persistence | `@nocms/session` (`stageEntry`/`commit`) + `GitHubClient` | wire editor `onChange` (today only logs) |

### Phases (D16 — tracer-slice first)

- **Phase 1 — the spine (specialize, one brick, scalar-only). DONE.** `@nocms/components/saved.ts`:
  `SavedComponentDef` + `savedBlockFromDefinition` (the synthesized block is the base
  **partially applied** — locked props baked, exposed passed through; no template substitution yet)
  + `savedPack` + `defineSavedComponent`. Wired one inlined example into the starter registry; it
  appears in the catalog and renders identically in reader, editor, island, and prerender
  (invariant #1).
- **Phase 1.5 — authoring UX + runtime registration. DONE.** A "Save as component" toolbar action →
  `SaveComponentDialog` (opt-out demotion: every control starts Editable, the author locks some) →
  the shell captures the selection's props, registers the block into the **live registry + canvas
  map** (the D19-deferred runtime registry update, by mutating the map the canvas reads each paint),
  and converts the selection into an instance. Definitions cross the editor boundary as a
  first-class artifact: `savedComponents` (rehydrate on mount) + `onSaveComponent` (emit on save) —
  symmetric with `onChange`. Covered by happy-dom UX tests.
- **Phase 2 — compose + slots.** Multi-brick subtree, opt-out demotion pruning, exposed child-region
  slots (lists fall out as children-in-a-slot). Adds the structure-template substitution mechanism.
- **Phase 3 — repo persistence + auto-sync.** Wire `onChange`/`onSaveComponent` → `@nocms/session` →
  `GitHubClient.commit` (definitions become repo files the build also reads); interface-change
  migration (find instances by name, rewrite attrs, `@version` drift detection, one wide commit).
  The editor seams exist; the read/write wiring does not (the editor persists nothing yet).
- **Phase 4 — library polish.** Detach, promoted-control rename / group / order, the library-manager
  surface, naming / collision rules vs `core`.

### Crux & risks

- **Static → dynamic registry is the one new architectural seam.** `registry.ts` is static TS
  imported by all four surfaces today; saved components must merge in at runtime from stored
  definitions, in the browser (editor/reader) *and* node (build). Where definition files live and how
  each surface discovers them is the load-bearing decision.
- **Persistence is unwired** (`onChange` logs only) — Phase 1 sidesteps it; Phase 3 depends on it.

## Open — details

- **Promoted-control rename / group / order**; **exposed-value migration** when an interface change
  renames or removes a prop.
- Catalog placement of the site's library pack; naming / collision rules vs the curated `core` pack.
