# Editor shell architecture & the `shell.tsx` size problem

`packages/editor/src/shell.tsx` (`mountEditor`) is the editor's interaction orchestrator. It has
repeatedly grown past ~1000 lines. This file records *why* and the decomposition we're applying,
so the size is treated as a structural issue to fix, not re-litigated each time.

## Why it is big (root causes, not incidental verbosity)

1. **One mega-closure.** The whole editor lives inside a single `mountEditor` function body
   (~870 lines). There are no internal boundaries; ~40 inner functions are defined inline.
2. **Shared mutable state by closure reference.** ~14 `let` variables (`doc`, `selectedPath`,
   `prose`, `overlay`, `breakpoint`, `appearance`, `dirty`, `publishStatus`, `mediaTarget`,
   `saveTarget`, `tokens`, …) are read/written from all over (`doc` 27×, `selectedPath` 32×,
   `prose` 27×). This is the deep blocker: any extracted piece needs several of these, so it
   either drags a large deps bag or stays inline. Mechanical line-extraction can't fix it.
3. **Manual render orchestration.** ~26 `render*` functions + ~21 imperative `render(vnode, host)`
   calls into ~7 hosts. Every command must remember which `render*` to re-run, in the right order
   — so handlers are verbose and coupled to presentation.
4. **Mixed concerns inside single functions.** e.g. `saveAsComponent` did model-building + node
   mutation + preact render + preview snapshot; `handleEdit` does serialize + canvas update +
   re-highlight + onChange + dirty.

## Decomposition (own state in controllers; shell becomes thin wiring)

Done:
- `frontmatter.ts` — YAML read/write (pure).
- `overlays.tsx` — hover box, selection name tag, drop line + surface geometry (owns its hosts).
- `save-component-action.ts` — pure SavedDef builder.
- `drag-controller.ts` — drag gesture; owns drag state, takes a `reorder` callback (no doc access).
- `prose-controller.ts` — in-place text editing; owns the `prose` state + format bar.

Planned (the high-coupling core — biggest remaining win, do it when not mid-test):
- **document store** — owns `doc` + history; all tree commands (commit/apply/undo/redo/insert/
  delete/duplicate/move/editFrontmatter). Exposes `doc` via a getter so call sites stay readable.
  This removes the most-shared mutable variable from the closure.
- **selection controller** — owns `selectedPath`; resolves clicks; emits selection changes.
- **chrome state** — fold `breakpoint`/`appearance`/`dirty`/`publishStatus`/`overlay` into one
  state object with a single `renderChrome`, instead of N booleans + scattered re-render calls.

## Invariant

`mountEditor` should be wiring: construct the canvas + controllers, connect their events, and
dispose them. Logic that owns state belongs in a controller, not in the closure. When you add a
feature, add it to (or as) a controller — do not grow the closure.
