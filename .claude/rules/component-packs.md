# Component packs & pluggable distribution

How components are declared, composed, distributed, and contributed by plugins. The
internals were always decoupled (the renderer and editor take the registry by injection;
controls derive from schema); this is the *composition and distribution* layer on top
(D18, D19).

## The model

- **Block** — one component + how the editor treats it: `BlockDef = { component, schema?,
  controls?, slots?, island?, displayName?, description?, category?, icon?, tags? }`
  (`@nocms/components/packs.ts`). A block declares its controls one of two ways:
  - a valibot `schema` (the curated/idiomatic path — one source for prop types *and* controls, D9), or
  - pre-derived `controls: ControlDescriptor[]` (for a block with no schema — a sandboxed
    plugin, whose schema can't cross postMessage).
  `controlsOf(def)` is the single place this is resolved (controls win over schema).

- **Pack** — the unit of distribution: `ComponentPack = { id, name?, version?, trust?, blocks }`.
  `definePack()` declares one; `createRegistry(...packs)` merges them, **later packs override
  earlier by block name** (the override seam). The curated library is the `core` pack;
  `registry = createRegistry(core)` is the default.

- **Manifest** — the serializable description of one insertable component:
  `ComponentManifest = { name, displayName, description?, category, icon?, tags?, slots?,
  island, controls, defaults }`. `manifestOf` / `registryManifest` derive it. **This is the
  cross-boundary currency**: a valibot schema (a function) and a Preact component do not survive
  `postMessage`; a `ControlDescriptor[]` + plain metadata do. The editor's insert palette and any
  catalog consume manifests *only*, so a built-in and a sandboxed component are indistinguishable
  to them.

## Adding a component to a site (no monorepo needed)

The site owns the **composition root** and the **client entrypoints**; `@nocms/build` provides
registry-injectable machinery. In the starter:

1. Write the component under `src/components/` (valibot schema → controls, like the curated set).
2. Register it in `src/registry.ts`: `createRegistry(core, definePack({ id: "site", blocks: {
   Name: block(Component, { schema, category, description }) } }))`. `block()` does the one cast
   from a typed Preact component to the registry's structural `AnyComponent`.
3. That one `registry` flows everywhere: the dev reader (`main.tsx`), the in-site editor
   (`edit.tsx` / `editor.client.ts`), island hydration (`island.client.ts`), and the publish
   prerender (`scripts/build.ts` → `buildSite({ registry })`).

`vendor.ts` bundles the **site's** `island.client.ts` / `editor.client.ts` (not the packages')
so the deployed editor + hydration compose the site registry. It resolves `@nocms/*` to workspace
source during bundling — the vendored renderer/build are node-targeted (they carry `node:url`
etc.), and only a from-source browser build tree-shakes those node-only paths out. A fork never
runs `vendor.ts`; it serves the committed bundles verbatim (D1).

Gotcha: Bun copies `file:` deps into its store at install time, so after re-vendoring the store
copy can lag — `bun install` refreshes it. The `predev`/`prebuild` hooks regenerate `vendor/`
from source each run.

## Plugin-contributed components (the sandbox boundary)

A sandboxed plugin contributes a component through the capability-scoped host API — never by
handing code to the host (invariant #8).

- The plugin calls `registerComponent(reg)` (gated by the `components:register` capability).
- `reg` is a `PluginComponentRegistration`: manifest-shaped (name, controls, metadata) **plus an
  HTML `template`**. Fully serializable.
- Host side, `createComponentRegistrar()` (`@nocms/sandbox`) implements the method:
  `validateRegistration` hardens the untrusted input (throws on a bad name/template — surfaced to
  the guest as a host-error, never a host crash; malformed controls are dropped, not fatal), then
  builds a `BlockDef`.
- **Render proxy**: the plugin's markup renders in an **inert sandboxed iframe** (`sandbox=""` →
  opaque origin, no scripts, no host DOM access), with `{{key}}` placeholders filled from props and
  HTML-escaped. The plugin's HTML never executes in the host context.
- `registrar.pack()` composes with `createRegistry`; `registrar.manifests()` feeds the palette;
  `registrar.subscribe()` notifies on registration. Because `BlockDef` carries pre-derived
  `controls`, the editor renders, lists, and configures plugin components with no editor changes.

Deferred: interactive plugin components need a host→guest render protocol (v1 is static-template
only); live hot-add into a *mounted* editor needs a registry-update API (`subscribe()` is the hook
to build it on).

## Invariants to hold

- One renderer, one component model: plugin components are normal `BlockDef`s in the same
  registry; the proxy is just a host-side component. Never a second renderer or registry.
- The palette/catalog consume **manifests**, not live `BlockDef`s — keep that seam so built-in
  and sandboxed components stay interchangeable.
- A plugin never receives the token, host DOM, or network; its markup renders inert. Validate
  every registration as untrusted input.
