---
paths:
  - "packages/renderer/src/islands.ts"
  - "packages/build/src/prerender.ts"
  - "packages/build/src/build-site.ts"
  - "packages/build/src/island-client.ts"
  - "packages/build/src/vite-plugins.ts"
---

# Island hydration

Islands make a prerendered page selectively interactive **without a second renderer**. Preact's
own `hydrate` runs over the *same* component model the editor previews and the build prerenders
with — "what you preview is what you publish" (invariant #1) extends to interactivity. There is
one renderer, one component registry, one component tree; hydration re-attaches to it, it does
not rebuild it.

The flow has three stages: **declare → prerender marker → hydrate**.

## 1. Declare (the boundary)

A component is an island because of *what it is*, declared once on its `@nocms/components`
registry entry: `{ component, island: true }`. Not per usage. There is no MDX annotation
(`<Counter client:load/>`) — that would scatter the decision across call sites and add an
annotation DSL, against the component-defined philosophy `@nocms/controls` already follows.

Consequence: **every** instance of an island hydrates. Per-instance static opt-out is a future
escape hatch, not v1.

## 2. Prerender marker + manifest

`@nocms/renderer`'s `islands.ts` owns the pure (no-DOM, no-MDX) pieces:

- `wrapIslandComponents(components, names)` replaces each named island with a host that, at
  render, wraps the real component's output in
  `<div data-island="<Name>" data-island-props="<json>" style="display:contents">`. The wrapper
  is layout-neutral; it only carries the name + props and is the container hydration targets.
- **Props are JSON** in `data-island-props`. Only JSON-serializable props travel. `children` and
  non-serializable props (functions, VNodes) are dropped — children come back from the marker's
  own SSR HTML at hydration. **v1 limit:** an island that needs its *children* re-rendered
  client-side (slotted content) is not supported yet; configure islands purely by serializable
  props (the `Counter` proof does).
- `collectIslands(tree, identify)` walks a *resolved* VNode tree → manifest (names +
  per-instance props). The prerender path can't use it (an MDX document renders lazily — there
  is no resolved tree before output), so it serves consumers that already hold a tree (the
  editor). The build instead reads the per-page manifest back from the emitted markers with
  `islandNamesFromHtml`.

`@nocms/build`'s `prerenderRoutes` wires this: pass `islands` (names) + `islandClientSrc`; it
wraps the component map, prerenders, reads each page's island set from the markers, and injects
the client `<script type="module">` **only into pages that contain an island**. Island-free
pages stay byte-for-byte identical to the static-only output and ship zero client JS — this is
the test that guards the static guarantee (`prerender.test.ts`).

## 3. Hydrate (the only DOM seam)

`hydrateIslands(components, root)` finds every `[data-island]`, deserializes its props, and calls
Preact `hydrate(h(Component, props), markerEl)` for the matching registry component. It is the
single DOM-touching function; everything above unit-tests without a browser.

`@nocms/build`'s `island-client.ts` is the browser entry: it builds the component map from the
island-flagged registry entries and runs `hydrateIslands` on load. It is bundled at **vendor
time** (D1) to a self-contained browser ESM with preact inlined and the MDX compiler
tree-shaken out (`vendor/build/islands.client.js`, committed), and `buildSite` copies it to
`dist/_nocms/islands.js`. A fork serves the committed bundle verbatim — it never rebuilds it.
`nocmsVitePlugins()` exposes the same entry as the `virtual:nocms-islands` module so a dev server
and the publish bundle resolve one island runtime.

## Invariants to hold

- Never introduce a second renderer, second component registry, or a divergent client tree.
  Hydration reuses the one renderer's components.
- Token theming stays runtime CSS variables (invariant #3) and must not depend on the island
  bundle — islands are client JS bundled at publish ③, hydration runs at runtime ①; keep them
  separate.
- Keep the static output view-source-able: island-free pages emit no markers and no script.
- The renderer's MDX `options` are built lazily (`evaluateOptions()`), so the hydration-only
  import path tree-shakes the compiler + remark stack out. Don't reintroduce a module-level
  const that pulls them back into the client bundle.
