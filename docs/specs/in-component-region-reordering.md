# In-component region reordering — design & build brief (D25)

> **How to use this document.** Self-contained brief for a *fresh* Claude Code session — assume no
> memory of the conversation that produced it. Read it top to bottom, then read the referenced files
> and decisions, then propose a plan before building. The full vision is large and architecturally
> loaded; treat the early phases as independently shippable and confirm scope with the user before
> writing code. The settled direction is recorded as **D25** in `DECISIONS.md` — this spec is its
> detail.

---

## 1. The user's goal, in their words

> "Taking the navbar as example, would it be possible to drag-and-drop and move *part* of a
> component? For instance, move the button to the left of the links? They're in a parent div that
> makes them sit on the right, so in my mind we should be able to move them within that scope. It's
> a generic feature, not navbar-specific. We should **not** be able to move a part *out* of the
> component (that's a component-definition change). And we need a clear UX path, because if it
> updates the **parent component** and not just the instance, the user must be made aware."

And, when pressed on why not just edit the JSX directly:

> "Why can't we reorder JSX tags when they are well-scoped AST parts? If we could, we could make our
> system pretty impressive by allowing us to edit almost any component."

So: rearrange a component's **internal parts** generically, **without** letting parts escape the
component, with a UX that distinguishes "editing this instance" from "editing the component itself"
— and an honest answer to "why not just rewrite the source."

---

## 2. The one insight everything hinges on: not all "parts" are data

The editor today reorders two kinds of things, because they are **data it owns**:

1. **Document blocks** — components placed on a page + their slotted children are nodes in the MDX
   document. Reordered by the **block drag** (cross-container; D22 step ④, `drag-controller.ts` block
   mode). Built.
2. **Array-prop items** — a prop that is an array of objects renders to repeated UI (pricing tiers,
   nav links). Each card is detected (`data-nocms-item`) and reordered by the **item drag**, which
   rewrites the array prop. Built (**D24**).

The navbar button is **neither**. As of the Tailwind migration (D23) the styling moved to utility
classes, but the **structure is unchanged** — `packages/components/src/sections/Navbar.tsx`:

```jsx
<header class="… flex items-center justify-between …">   {/* brand left, nav right */}
  <a href="/">…brand / brandMark / tagline…</a>          {/* LEFT */}
  <nav class="flex items-center gap-md flex-wrap">        {/* RIGHT */}
    {links.map((link) => <a …>{link.label}</a>)}          {/* the `links` ARRAY prop */}
    {ctaLabel ? <Button label={ctaLabel} … /> : null}     {/* the CTA — a SEPARATE scalar prop */}
  </nav>
</header>
```

- The links are an array → already reorderable among themselves (item drag, D24).
- The CTA button is a **separate scalar prop** in a **fixed JSX position** (always after the links,
  inside `<nav>`). Its position is not stored anywhere the editor can edit — it is written into the
  component's **source code**.

**Stated plainly (this was the confusing point in conversation):** a component is code — a
blueprint. The developer who wrote `Navbar.tsx` decided "brand left, then links, then button." The
editor edits a site's **content and a component's exposed knobs** (text, props, arrays, slots, and
now per-element `class` via the Style panel), but it does **not** edit a component's blueprint at
runtime. "Move the button left of the links" asks to change the blueprint — categorically different
from anything the drag system does.

---

## 3. Why not just edit the source AST? (the user's sharp question, answered)

Reordering well-scoped sibling JSX by editing the component's source AST is **feasible** — Onlook
(cited in D23) does exactly this. So the honest objection is not "impossible," it is **"it changes
what kind of tool noCMS is, at a specific and knowable cost."** Editing component JSX breaks the
"data editor, no build, one renderer" model in five concrete places:

1. **Components are compiled functions at runtime, not source.** The browser editor holds `Navbar`
   as a bundled JS function. Reordering its tags needs the **source** + a **TS/JSX compiler in the
   browser** + **recompile-and-hot-swap** to preview — heavy toolchain, and it kills "instant edit,
   no build" (#3): the change isn't visible until something recompiles.
2. **JSX children are code, not a clean list.** `{links.map(...)}` (loop) and `{ctaLabel ? … }`
   (conditional) — swapping *those two* is safe, but in general children include fragments, spreads,
   conditionals sharing variables. "Well-scoped" is a real subset, but detecting it reliably across
   every component is a fuzzy classifier that will refuse, or worse mis-reorder and break the render.
3. **Curated components have no source in the site repo.** A fork ships *vendored compiled bundles*
   of `@nocms/*`, not TSX (D1, self-contained forks). "Edit the navbar" has nothing to edit unless
   you **eject** it — copy its source into the site as an owned component, converting "I use the
   library" into "I maintain a fork," exactly the burden noCMS spares non-developers.
4. **It crosses the content↔code boundary.** Today the editor only touches structured, safe things;
   code is a security/review boundary (the sandbox, #8, exists because code is dangerous). A visual
   editor that rewrites component code is a code editor — arbitrary behavior, review diffs, different
   trust model.
5. **preview = publish needs two compilers in lockstep** (#1) — the same risk D23 flags for its two
   Tailwind engines, but harder: full TS/JSX compilation in the browser must match the build exactly.

None is fatal. They are the price of becoming Onlook — a deliberate future fork toward a visual code
tool, recorded as out of scope here (#1, D14, D20), never something a drag handle sneaks in.

**The move that keeps the power and drops the cost:** "well-scoped" can be *guaranteed* instead of
*inferred* — let the component author **declare** the rearrangeable region as a **slot** or **Frame**
(D22). Then the region *is* an ordered, reorderable list by contract, the one renderer already
understands it as data, and reordering is a normal data edit: zero toolchain, zero recompile, zero
boundary crossing. That is §4.

---

## 4. The architectural line: instance vs definition

The user's framing ("update the parent component, not just the instance") is exactly the boundary
noCMS draws.

| | **Instance** (this page) | **Definition / master** (the component itself) |
|---|---|---|
| What it is | which components are placed, their props, their order, their **slot children**, their per-element `class` | the component's *internal* arrangement / structure |
| Stored where | the MDX document + prop/`class` attributes | the component's code (curated) or its saved-component definition |
| Editable at runtime? | Yes — block drag, item drag, Style panel | Only **owner-authored** saved/composed components; **never** curated component code |
| Scope of effect | this one place | **every instance** |

**The Style panel (D23) is the precedent and stays on the instance side.** It writes the selected
element's **`class` attribute on a placed block** (`StyleSectionContext.getClass/setClass` → normal
serialize + repaint; host-injected, editor stays styling-agnostic). It edits an instance attribute,
never the blueprint — the same line this feature draws for *structure*.

Read these:
- **CLAUDE.md** — invariant #1 (one renderer, no code generator), #3 (instant edit, no build), and
  the non-goal: "end-user authoring of arbitrary custom components (compose from the library/plugins
  instead)."
- **D14** — multi-framework / arbitrary-component authoring rejected.
- **D15** — uniform block tree + container **slots**.
- **D20** (`docs/specs/saved-components.md`) — saved component = symbol with encapsulation; instances
  depend on the *interface* (exposed props + **slots**), never the *implementation*. Names the
  **edit-master** op and its guardrail (block hand-edits to an attached instance's internals; steer
  to *edit master* or *detach*). **Repo persistence is currently deferred.**
- **D22** (`docs/specs/layout-tools.md`) — the **Frame**: one auto-layout container (row/column/grid)
  whose children flow under constrained rules. The *vehicle* that turns a fixed JSX row into an
  editor-aware, reorderable region. Drag-to-arrange is its step ④, built.
- **D23** — Tailwind v4 engine + per-element Style panel (`StyleSectionContext` in `shell.tsx`).
- **D24** — array items as canvas objects: the closest existing analog (`item-selection.ts`,
  `content-anchors.ts` item tagging, `drag-controller.ts` item mode).

---

## 5. What is in scope — the reframing

You **cannot** make "drag any pixel of any component" work without becoming a code editor (§3). The
in-scope, architecturally-honest version:

> **Reorder a component's internal regions, when those regions are modeled as data (a slot, an
> auto-layout Frame, or an array) rather than fixed JSX.**

Three distinct concerns — keep them separate when planning:

- **(A) Modeling.** A component exposes its rearrangeable regions as data — a **Frame** (D22) or
  named **slots** (D15/D20). A curated component with a hardcoded row (Navbar's `<nav>`) does **not**
  participate until re-authored to use a Frame/slot there. A one-time component-design change (by a
  developer, or via the "compose" save-as-component flow), **not** a capability over arbitrary markup.

- **(B) Instance-level reorder.** Once a region is a Frame/slot whose children are **document
  nodes**, reordering them is *mostly already built*: block drag reorders MDX children within and
  across containers, and a composed component's slot contents are per-instance inline MDX (D20). So
  **dragging blocks inside an instance's slot already works.** The gap is only for regions whose
  parts are **not** MDX children (a prop-positioned button) — those need concern A first.

- **(C) Master-level reorder ("edit the component").** When the arrangement belongs to a component's
  **definition** (a composed master's region layout), reordering it is an **edit-master** op (D20):
  it changes the definition and re-renders **all** instances. This is the part that "updates the
  parent component" and needs the scoped UX in §6. Gated on D20's deferred repo persistence.

**Net:** the feature is "(A) let components model regions as reorderable data, (B) reuse the drag
system to reorder them per-instance, (C) add a clearly-scoped *edit-component* mode for when the
reorder is a definition change" — not "move parts of components."

---

## 6. The UX the user explicitly asked for

The user must always know whether a drag edits **this page** or **the component everywhere**.

- **Two visibly separate scopes.**
  - *Editing the page* (default): drags reorder document blocks, array items, an instance's slot
    children. Today's chrome/accent.
  - *Editing a component* (explicit): entered deliberately — an **"Edit component"** action on a
    selected component, or double-clicking *into* it. While in it: a **persistent banner** (`Editing
    ‹Navbar› — changes apply to all N places it's used`), a **distinct chrome accent** (different from
    the normal slate-blue selection accent), an explicit **Exit**, and drags that reorder the
    component's **own regions**, committing the **definition** (saved-component def → repo,
    branch-per-session, publish async — gated on D20 persistence), not this page.
- **Bounded drags only.** In either scope a drag reorders **modeled regions** (slot/Frame children,
  array items) — never arbitrary DOM, and **never out of the component**. Moving a part out is not a
  drag; it is an explicit **detach** (D20). Satisfies the user's "can't move out" rule structurally.
- **Guardrail (D20).** On an *attached* saved-component instance, block hand-editing its
  internal/locked region in page scope; offer "Edit component" or "Detach" — else edit-master
  auto-sync clobbers the local change.

Open UX questions for the next session to settle with the user:
- Entry gesture: dedicated button vs double-click-to-enter vs both.
- What "all N places it's used" counts (this page vs repo-wide — needs a usage index).
- Whether instance-scope slot reordering needs new UI beyond discoverability (show slot boundaries +
  the slot name when a slotted/Frame component is selected). Given the **Escape "zoom out"** hierarchy
  already exists (`shell.tsx`: text → item → component → container), reuse it to step *into* scopes.

---

## 7. Suggested build phases (each independently shippable)

1. **Audit & decide modeling (A vs B per component).** Inventory curated components with fixed
   internal rows users will want to rearrange (Navbar `<nav>`, Hero actions, Footer columns, CTA
   button groups). Decide which become Frames/slots.
2. **Instance-scope slot reorder polish.** Verify block drag already reorders a composed component's
   slot children; add slot-boundary affordances (show the drop region + slot name) when a slotted/
   Frame component is selected. Small, high-value, no master editing.
3. **Frame-ify one component (tracer).** Re-author one component (suggest Navbar's `<nav>` row as a
   Frame / ordered "actions" slot) and prove the CTA-vs-links reorder end-to-end at the **instance**
   level. Validates Option A with zero master-edit machinery.
4. **Edit-component scope (the big one).** Explicit master-edit mode + scope banner + distinct accent
   + exit, on a **composed saved component**, region reorder persisting to the definition. Depends on
   D20 repo persistence (deferred) — land it or stub it first.
5. **Guardrails & detach.** Block internal hand-edits on attached instances (steer to edit/detach);
   wire the explicit detach action.

Stop after each phase and re-confirm; phases 1–3 deliver real value without the heaviest machinery.

---

## 8. Key open decisions to resolve before/while building

- **Option A vs B** (§5) — the framing choice; everything follows from it.
- **Does instance-scope reordering need new drag code, or only affordances?** (Block drag likely
  already covers MDX-child slots; confirm with a composed component that has multiple slot children.)
- **How regions are modeled** — reuse the D22 Frame, or a lighter "ordered named regions" prop?
  Prefer Frame unless too heavy for, e.g., a 2-item nav row.
- **Saved-component repo persistence** (D20 deferred) — phase 4 needs it; land or stub.
- **Usage index** — "affects N places" needs knowing where a component is used; scope to current page
  first, repo-wide later.

---

## 9. Reference map

- `packages/components/src/sections/Navbar.tsx` — the worked example (hardcoded `<nav>` row, now
  Tailwind utilities; structure unchanged).
- `packages/components/src/saved.ts` — `SavedComponentDef` (locked/exposed/version): the definition
  data the editor owns for saved components.
- `packages/editor/src/save-component-action.ts` — specialize vs compose; how a selection becomes a
  saved component (slots → composed).
- `packages/editor/src/drag-controller.ts` — block drag + item drag (the `DragSession` model to
  extend); `drag.ts` (pure `resolveDrop`, axis-aware gap).
- `packages/editor/src/item-selection.ts`, `content-anchors.ts` — `data-nocms-item` detection /
  array-item reorder (D24), the closest existing analog.
- `packages/editor/src/shell.tsx` — selection model; `StyleSectionContext` / `renderStyleSection`
  (D23 per-element class editing, the instance-attribute precedent); the Escape "zoom out" hierarchy
  (text → item → component → container) where an "edit component" scope would hook.
- `DECISIONS.md` — D14, D15, D18/D19, **D20** (saved/compose + edit-master), **D22** (Frame), **D23**
  (Tailwind + Style panel), **D24** (array items), **D25** (this decision).
- `docs/specs/saved-components.md`, `docs/specs/layout-tools.md` — the two specs this sits between.
- `CLAUDE.md` — invariants (esp. #1, #3) and the no-arbitrary-component-authoring non-goal.

---

## 10. One-paragraph summary (TL;DR)

Users want to rearrange a component's internal parts (e.g. the navbar's CTA button vs its links).
Those parts are reorderable only when the component **models them as data** — a slot, a D22 Frame,
or an array — never when they are fixed JSX in the component's code; rewriting the latter would turn
a no-build data editor into an in-browser code editor with a compile step (curated components ship as
bundles, not source; "well-scoped" JSX is a fuzzy classifier; preview=publish would need two
compilers), which is out of scope (#1, D14, D20). The per-element Style panel (D23) sets the
precedent: it edits an **instance attribute** (`class` on a placed block), never the blueprint. So
the feature is: (A) author components to expose rearrangeable regions as Frames/slots, (B) reuse the
existing drag system to reorder them **within an instance** (already mostly works for MDX-child
slots), and (C) add an explicit, clearly-labeled **"Edit component"** scope for when the reorder
changes the component **definition** and therefore every instance — with a scope-of-effect banner, a
distinct accent, repo persistence, and a hard rule that parts reorder *within* a component but are
never dragged *out* (that is an explicit *detach*, not a drag).
