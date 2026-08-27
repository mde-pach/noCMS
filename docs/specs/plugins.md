# Spec — Plugins & Extensibility (L4)

The L4 extension path: how third parties add components, sections, controls, and themes **without
ever gaining the host's privileges**. The security engine already exists — `@nocms/sandbox` runs
plugin code in a null-origin iframe behind a capability-scoped postMessage broker (invariant #8, D4
iframe-only). This spec defines the *seam*: what a plugin may contribute, how it crosses the
boundary, and how its output reaches the one renderer. Marketplace/discovery UX is **deferred**
(VISION.md); the install seam and contribution contracts are not.

> **North star:** a plugin extends the product by handing the host **data** — a props schema, a
> render tree, a section composition, a token set — and at most a renderer confined to its own
> frame. It never touches the GitHub token, the host DOM, or the network by default. Adding a plugin
> can make the editor richer; it can never make a site less safe or less self-contained.

## 1. What a plugin can contribute

Four contribution types, each mapped to a `Capability` (core's closed set) — and notably, three of
the four are **pure data**, which is what keeps the boundary clean:

| Contribution | Capability | What crosses the seam | Code in sandbox? |
|---|---|---|---|
| **Component** | `components:register` | a valibot props schema + a render function | yes (render → tree) |
| **Custom control kind** | `components:register` | a `kind` registration + a renderer | yes (renderer in frame) |
| **Section** (saved composition) | `layout:contribute` | a composition template (MDX/JSX of known components) | no — pure data |
| **Theme / tokens** | `tokens:contribute` | a flat token set (component-library roles) | no — pure data |

- **Components.** A plugin component is a pure function `(props) → tree-of-known-components` plus its
  valibot schema (component-library brick rule #1). The schema drives its panel (§3); the render
  produces a tree the host paints (§4).
- **Sections** are *just compositions of already-trusted components* (component-library: "a section is
  a saved composition"), so a plugin section is a template — data, no execution — that lands in the
  insert palette / section library beside curated ones.
- **Control kinds** register into the controls-system's **open meta-type registry** (controls-system
  §3): `kind → renderer`. The renderer runs in the plugin frame; the host composes it. Unknown kinds
  still fall back to a base control, so a missing plugin never blanks a panel.
- **Themes/tokens** contribute flat token values (Phase 3's roles + ramps); they are merged under the
  owner's own token file, which always wins (§ open questions: precedence).

## 2. The security boundary (invariant #8 — the hard rule)

Plugin code runs in a sandboxed, null-origin iframe; it reaches the host **only** through the
capability-scoped broker over a transferred `MessagePort` (`@nocms/sandbox`'s `loadPlugin`). The
grant is **deny-by-default**: `granted = manifest.capabilities ∩ owner-approved`. The `Capability`
set is exactly:

- `components:register` — contribute components / control kinds (render + schema only).
- `content:read` — read site content (e.g. a "latest posts" component); **read, never write**.
- `tokens:contribute` — add token sets / themes.
- `layout:contribute` — add sections / layout compositions.
- `network` — make network requests; **off by default**, enforced by the frame CSP (`withCspMeta`),
  so denial applies to the guest document itself, not just the broker.

What a plugin **never** gets, at any grant level: the GitHub token (invariant #7 — token lives only
in the host/auth context), the host DOM, write access to the repo, or network without `network`.
The host API surface (`HostApi`) the broker exposes is itself the allowlist — capabilities gate
*which methods* answer, deny-by-default.

## 3. How a sandboxed component gets an editor panel

This is the controls-system runtime path (controls-system §7), reused verbatim — do not duplicate it:

1. The plugin ships its valibot props schema **with** the component, inside the frame.
2. On selection, `deriveControls` runs (in the frame or host over the transferred schema) → a
   `ControlDescriptor[]`, which is **pure serializable data**.
3. The descriptors cross the postMessage seam; the **host renders the panel** (control rendering is
   always host-side). Edited **values** cross back to the frame.

So a plugin component gets a real props panel with no build step and no per-plugin control metadata,
and the host never executes plugin code to draw a control. A plugin-*registered* control kind (§1)
is the one case where a renderer runs in the frame — still composed by the host, never privileged.

## 4. The render boundary (reconciling with invariant #1)

The central question: a plugin component must appear on the canvas and in the *published static
HTML*, while staying sandboxed. Two models:

- **(A) Guest renders into its iframe.** Rejected for the default path: it breaks invariant #1 (the
  plugin uses its own renderer, not the one renderer), can't prerender to static HTML at publish (the
  iframe is a runtime black box), and tokens/layout don't flow across the iframe isolation.
- **(B) Guest emits a tree; the host renders it. ✅ recommended.** The plugin's render is a pure
  function returning a **constrained, serializable component tree** (a vnode subset limited to known
  curated components + the plugin's own registered components + their props). That tree crosses the
  seam as data, and the **host's one renderer** paints it — live in preview, `preact-render-to-string`
  at publish (invariant #1). Tokens flow because the host renders; the plugin never touches host DOM.

This is symmetric with §3: **schema in as data, render-tree out as data.** The cost is that a plugin
component cannot emit arbitrary DOM or run client-side JS in the published page.

**Interactivity** is therefore the honest boundary. Static plugin components (a chart from content,
a fancy gallery layout) are the v1 primary path — they prerender cleanly. A plugin component that
needs *runtime* interactivity must persist its sandboxed iframe into the published page as a
sandboxed island; that is heavier and left as a documented escalation (§ open questions), not v1.

## 5. Plugin manifest & distribution

A plugin is described by core's `PluginManifest`:

```ts
interface PluginManifest {
  name: string;
  version: string;
  integrity: string;        // hash recorded in the site repo for reproducible installs
  capabilities: Capability[];
}
```

- **Distribution mirrors D1 (self-contained sites).** A plugin's built bundle is **vendored into the
  owner's repo** (committed), and the manifest — including the `integrity` hash — is recorded in
  `nocms.config.json` (D8). The site stays self-contained (invariant #2) and the install is
  reproducible: the bundle that runs is the one whose hash the repo records.
- **Install seam.** The owner references a plugin (by repo/URL), reviews the **requested
  capabilities**, approves a grant (a subset — deny-by-default), and the vendored bundle + integrity
  + granted capabilities are written to the repo. No central service; nothing a site depends on at
  runtime beyond its own repo.
- **Trust** rests on three legs: the integrity hash (tamper-evidence), the explicit capability grant
  (least privilege), and the sandbox (containment). **Marketplace/discovery/ratings are deferred** —
  the seam above stands without them.

## 6. Progressive disclosure

| Altitude | Sees plugins? | How |
|---|---|---|
| **L0 Content** | no | never |
| **L1 Compose** | indirectly | plugin sections/components appear in the palette beside curated ones (trust-badged) |
| **L2 Design** | indirectly | plugin themes appear as presets |
| **L3 Structure** | no | — |
| **L4 Extend** | yes | install/remove plugins, review & adjust capability grants |

A non-developer never manages plugins; they only ever encounter their *output* as more bricks in the
palette. Installation, capability review, and removal live entirely at L4 (settings.md's account/site
area).

## Anti-patterns to avoid

1. **Plugin rendering arbitrary DOM into the host** — breaks invariants #1 and #8; emit a constrained
   tree (§4), never host DOM.
2. **Granting all requested capabilities by default in production** — deny-by-default; the owner
   reviews and approves a subset.
3. **Network on by default** — gated by the `network` capability + frame CSP.
4. **A plugin ever seeing the GitHub token** — it lives only in the host (invariant #7), full stop.
5. **Fetching plugin code from a third-party origin at runtime** — vendor + integrity-check (D1), or
   the site stops being self-contained and reproducible.
6. **Sections that require code** — sections are pure compositions of trusted components; keep them
   data.
7. **Throwing when a plugin/control kind is missing** — fall back gracefully (controls-system §3).

## Open questions → Claude Design exploration targets

- **Interactive plugin islands in the published page** — the §4 escalation: a persistent sandboxed
  iframe-as-island at runtime, its prerender placeholder, and the hydration/cost model.
- **Capability-grant UX** — how an owner reviews "this plugin wants: read your content, add network
  access" in plain language without security jargon, and the consequences of saying no (prime Claude
  Design target).
- **Palette integration** — how plugin components/sections appear beside curated ones: namespacing,
  a trust/source badge, and avoiding a flood that dilutes the curated set (component-library's
  "small, opinionated" rule).
- **Token precedence** — merging a plugin theme under the owner's flat token file (who wins per role,
  how conflicts surface).
- **Control-kind versioning** — a plugin declaring which control kinds/versions it needs, and
  host/plugin compatibility as kinds evolve (cross-ref controls-system open questions).
- **The render-tree contract** — exactly which vnode subset a plugin may emit, and how it references
  curated vs its own components.

## Relationship to existing seams

- `@nocms/sandbox` — the engine: `loadPlugin(manifest, host, {grant, source})`, the capability broker
  over a `MessagePort`, `frameSandboxPolicy` (sandbox attrs + CSP) from the grant. This spec adds no
  new boundary — it defines what flows across the existing one.
- `@nocms/core` — `PluginManifest` + `Capability` (the contribution + grant vocabulary); home of
  `deriveControls` (§3) and the render-tree contract (§4).
- `@nocms/components` — the curated vocabulary a plugin's render tree (§4) and sections (§1) compose
  from; plugins register *alongside* the registry.
- `@nocms/renderer` — paints the host-side tree a plugin emits, in preview and at publish (invariant
  #1).
- `@nocms/editor` — renders plugin control panels (§3) and surfaces plugin bricks in the palette (§6).
- `nocms.config.json` (D8) — records installed plugins, their integrity, and granted capabilities,
  keeping the site self-contained (D1, invariant #2).
