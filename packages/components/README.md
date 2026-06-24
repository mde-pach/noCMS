# @nocms/components

The curated, props-discoverable Preact component library composed visually in the editor. Each component's props are plain typed Preact props so props-discovery derives controls automatically.

Most primitives are static. A component that needs client interactivity is an **island**, declared by `island: true` on its registry entry (e.g. `Counter`); the build prerenders it, then the island client hydrates it in the browser. See `.claude/rules/islands.md`.

The public API is `src/index.ts` — depend on that, not internals. Architecture invariants and conventions live in the repo `CLAUDE.md`.
