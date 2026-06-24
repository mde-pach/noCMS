# Open decisions

Big forks deferred until decided with the project owner. Straightforward
implementation proceeds around these; nothing here is settled. When one is
resolved, record the choice + rationale and move it to the "Resolved" section.

## Open

### D1 — Package distribution model (gates standalone fork)
A forked `templates/starter` must install `@nocms/*` outside this monorepo. Today
they are `private` + `workspace:*`, so a fork can't resolve them.
- Options: (a) publish packages to npm; (b) vendor a built editor/runtime bundle
  into the template; (c) the template *is* a thin app that fetches a pinned,
  integrity-hashed editor build at runtime.
- Blocks: standalone fork, the editor mount in the starter, the real publish CI
  for forks.

### D2 — Editor engine architecture
WYSIWYG over MDX with lossless round-trip. Reference (engine approach only, treat
as a POC): cat-next TipTap editor at
`/Users/maximedepachtere/project/papernest/cat-next/apps/front/features/editor`.
- To decide: TipTap/ProseMirror vs CodeMirror+preview vs custom; how the document
  model maps to MDX text (so layout stays line-mergeable); how the runtime
  renderer is reused as the canvas.

### D3 — Derive ② toolbox (per feature)
Search index (e.g. Pagefind vs custom sharded index), i18n bundle format, manifest
/feed shapes. Decide per feature; each may differ.

### D4 — Sandbox engine
Plugin isolation: iframe + QuickJS-in-WASM vs iframe-only for v1 (§17 of the
original vision). Affects `@nocms/sandbox`.

### D5 — URL / routing model
How content paths map to routes; client router choice (lightest viable).

### D6 — Build SSG shape
`@nocms/build` prerender approach: multi-route prerender + island hydration via
`@preact/preset-vite` prerender vs a custom render loop over the renderer. Partly
straightforward, but the island/hydration boundary is a real design choice.

## Resolved

_(none yet)_
