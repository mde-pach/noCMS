# Open decisions

Big forks deferred until decided with the project owner. Straightforward
implementation proceeds around these; nothing here is settled. When one is
resolved, record the choice + rationale and move it to the "Resolved" section.

## Open

### D3 — Derive ② toolbox (per feature)
Search index (e.g. Pagefind vs custom sharded index), i18n bundle format, manifest
/feed shapes. Decide per feature; each may differ.

- **Search → RESOLVED: MiniSearch (corpus-based engine), not Pagefind, not hand-rolled.** Two
  forks were evaluated against the seam + the project values:
  - *Pagefind* (and other HTML-crawlers / WASM sharded indexes like tinysearch) crawls *built
    HTML*, so it can't consume `@nocms/derive`'s input (`CollectionEntry[]`) without inverting
    the tier order — it would belong in ③, after the build, and brings WASM + no fuzzy. Its
    sharded lazy-load wins only at large corpora; documented as the escalation path, not v1.
  - *Hand-rolling* an inverted index (the first cut) gave zero ranking/fuzzy/prefix and would
    mean owning the hard parts of search forever — exactly the reinvention the project avoids.
  - **MiniSearch** (MIT, zero runtime deps, framework-agnostic) indexes the JSON corpus
    directly and its serialize/load split maps onto the tiers: the ② Action builds the index
    and `JSON.stringify`s it to one `search.json`; the ① runtime loads it with
    `MiniSearch.loadJSONAsync(json, SEARCH_OPTIONS)` and queries with real BM25 ranking +
    fuzzy + prefix. Rejected FlexSearch/Fuse (Apache-2.0; project leans MIT) and Lunr
    (bulky index, unmaintained). Good to ~50k docs — past that, escalate to sharding.
  - `searchJob` (`search.ts`): `plainText` reduces an MDX body to searchable text by
    lightweight regex (no MDX compiler in the batch tier — search tolerates lossy text);
    MiniSearch owns tokenization/ranking. Build and runtime share `SEARCH_OPTIONS`
    (`fields: [title, text]`, `storeFields: [collection, path, title, excerpt]`). Wired into
    `deriveAll`. The one dependency added is justified: search relevance is hard, MiniSearch is
    tiny + MIT + zero-dep, and reimplementing it well is disproportionate.
- **i18n declaration → RESOLVED: locale directory (`content/<locale>/…`), default locale at the
  content root.** Content declares a translation by *where the file lives*: the default locale
  (the first entry in `locales`) is authored at the root (`content/about.mdx` → `/about`); every
  other locale lives under its own directory (`content/fr/about.mdx` → `/fr/about`). Two files are
  translations of each other when their locale-stripped path matches. Three forks were weighed
  against the shared route mapping (invariant #5: text, line-mergeable) and editor-authorability:
  - *Filename locale suffix* (`about.fr.mdx`): `contentPathToRoute` is shared, unchanged, across
    all three tiers — it would map `about.fr.mdx` to `/about.fr`, an ugly route, unless locale
    special-casing were pushed *into* core's mapping (forbidden here, and it would couple every
    tier to a locale convention). Locale buried in a filename is also the least scannable.
  - *Frontmatter `lang` + shared `translationKey`*: decouples locale from route (flexible) but
    introduces a hidden, typo-prone shared-key invariant (a mistyped key silently unlinks a
    translation) and requires parsing frontmatter just to learn a file's locale/group. Kept as the
    escape hatch if non-parallel locale structures are ever needed.
  - **Locale directory** wins because the locale is *structural* — the first path segment — so the
    route falls out of core's existing `contentPathToRoute` with **zero core changes** and yields
    the clean, real, prefix-based URLs (`/fr/about`) the rest of the site already serves. The
    translation key is the canonical default-locale route (`contentPathToRoute` of the
    locale-stripped path), so grouping reuses the one shared mapping instead of inventing a second.
    Limitation (documented): the default locale must be authored at the root, not under
    `content/<defaultLocale>/`.
  - `i18nJob` (`i18n.ts`) is a no-op unless `locales` has ≥2 entries (a default + ≥1 translation).
    It emits per-locale bundles `i18n/<locale>.json` (`{ locale, entries: [{ key, route, path,
    data }] }` — the locale's content index, sorted by key) and a `i18n/translations.json`
    (`{ defaultLocale, locales, groups: [{ key, translations: { <locale>: <route> } }] }`, groups
    sorted by key) so the runtime can render a language switcher from a page's other-locale URLs.
    Pure; missing translations simply omit that locale from the group.
- **Feed shape → RESOLVED: JSON Feed 1.1, single format (hand-emitted, no dependency).** A feed is
  a small, stable spec, so it is hand-emitted per the project dependency bar. Three forks:
  - *RSS 2.0* is the most widely consumed but the loosest spec, and its RFC-822 dates need
    locale-independent English month/day names — bug-prone to hand-roll correctly.
  - *Atom 1.0* is the strictest/most-correct (RFC-3339 dates, required stable `id`/`updated`) but
    the most verbose, and still carries XML-escaping pitfalls.
  - **JSON Feed 1.1** wins on two project-specific axes: (1) the ②→① handoff — the runtime reads
    it with plain `fetch`+`JSON.parse` (no XML parser), so the same file doubles as a syndication
    feed *and* the data source for an in-site "latest" island; (2) hand-emission correctness —
    `JSON.stringify` eliminates the entire class of XML-escaping and RFC-822 date bugs, and dates
    are ISO-8601/RFC-3339, which we already produce. RSS/Atom XML syndication is the documented
    escalation path (a second builder behind the same conditional-job seam), mirroring how Search
    documented sharding rather than over-building v1.
  - `feedJob` (`feed.ts`) is a no-op unless both `siteUrl` and a `feed` config (`{ collections,
    title, description? }`) are present. Item URLs are absolute via `contentPathToRoute` + `siteUrl`
    (identical to the sitemap, so feed and site agree). Field conventions (all tolerant of missing
    values): `title` ← `data.title` (else filename-derived); `date_published` ← `data.date` then
    `data.published`, parsed to RFC-3339 (unparseable/absent → omitted); `summary` ← `data.summary`
    then `data.description`; `content_text` ← `plainText(body)` (no MDX compiler in ② — tier
    discipline); item `id` is the absolute URL. Deterministic order: date desc, then dateless items
    by URL asc, for clean committed output.

### D5 — URL / routing model

**Path↔route mapping → RESOLVED, and it lives in `@nocms/core` (`route.ts`).** Build (③),
derive (②), and the client runtime (①) all need the same convention, so per the invariant
"if two packages need the same thing it belongs in core" the canonical mapping is in core,
not duplicated. `contentPathToRoute` (full `content/...` path or content-relative),
`routeToContentPath` (inverse → canonical `index.mdx` form, since the forward map is
many-to-one), `normalizeRoutePath`, and `href(routePath, base)` (joins a deployment base).
Convention unchanged from the build's original: strip `.mdx?`, collapse a trailing `index`
segment, root with `/` (`content/index.mdx → /`, `content/posts/a.mdx → /posts/a`,
`content/posts/index.mdx → /posts`). FOLLOW-UP DONE: `@nocms/build` now consumes core's
`contentPathToRoute` (its local copy was removed), so all three tiers share the one mapping.

**Navigation model → RESOLVED: static multi-page is the default; an optional, dependency-free
History-API soft-navigation enhancement is provided; no client-router framework is adopted.**

- *The fork.* Static multi-page (every `<a href>` is a real page load against prerendered
  HTML — zero routing JS) vs. a client router that swaps views via the History API (soft
  navigation, preserved JS state, no flash).
- *Decision.* **Static multi-page is the foundation.** The build already prerenders every
  route to view-source-able static HTML (D6), GitHub Pages serves it, and a content site that
  navigates with zero routing JS is the most robust and most decentralized option (invariant
  #2: nothing the project runs can break a site; a site with no router can't have a broken
  router). Soft navigation is a **progressive enhancement**, not the base layer.
- *The enhancement.* `@nocms/router`'s `startNavigation(table, { base })` — a ~80-line
  History-API interceptor over the route table: it catches same-origin, unmodified, non-target
  /-download left-clicks whose pathname matches a known route, `pushState`s instead of
  reloading, mirrors back/forward via `popstate`, and exposes the current route via
  `current()` + `subscribe()`. Same-origin clicks to *unmatched* paths (assets, unknown pages)
  fall through to a normal page load. It is framework-agnostic (emits route changes; the host
  renders) and its DOM/History access is injected (`options.window`) so the table logic that
  drives it unit-tests under happy-dom. **Off by default** — a site opts in by calling it.
- *Why build it, not adopt preact-iso / wouter.* Both are JSX-component-route routers
  (`<Router><Route path=… component=…/></Router>`): they own a component-per-route model and
  (preact-iso) async lazy-loading + suspense hydration. noCMS's model is content-file-based
  over the *one* mdast renderer — there is no component-per-route tree to express, so a
  framework router would impose a second routing model and a hard Preact-router dependency for
  a need that is, here, just "intercept a click and tell me the matched route." That fails the
  project's "prefer stdlib, justify any dep" bar (the same bar that admitted MiniSearch only
  after hand-rolling search proved disproportionate — here the inverse holds: the in-house
  interceptor is tiny and the dep buys nothing). Rejected: **preact-iso** (couples routing to a
  JSX `<Router>` + lazy/suspense model we don't use; Preact-locked), **wouter** (~2.2kB, same
  JSX-route model), and **React Router** (heavy, wrong framework).

**Sub-decisions (recorded; the decision-free core is built around them):**

- *Dynamic params.* The matcher supports `:param` segments (e.g. `/posts/:slug`, multi-param,
  percent-decoded, static-beats-param specificity), but the **content-derived table is purely
  static** — every content file is its own route, so file-based content needs no param routes.
  `:param` support exists so derive/② or build/③ can *emit* param/collection/pagination routes
  later without a matcher redesign. **DEFERRED:** who generates collection/pagination routes
  (e.g. `/posts/page/:n`) and how — a derive/build concern, not the router model.
- *i18n locale prefixes.* **RESOLVED: the locale is an ordinary leading static path segment;
  the route table stays locale-agnostic.** The i18n content convention (D3) already authors a
  non-default locale under its own directory (`content/fr/about.mdx`) and the default locale at
  the root (`content/about.mdx`), so core's `contentPathToRoute` yields `/fr/about` and `/about`
  as plain static routes with **zero** special-casing — every localized page is its own
  prerendered route, consistent with "every content file is its own route." The language
  switcher is driven entirely by the derived `i18n/translations.json` (core's
  `localeLinks(manifest, currentRoute, base)`: find the group containing the current route, emit
  one `href` per locale), **not** by route-pattern locale logic. Rejected the two deferred
  shapes: a **`:lang` leading param** would impose a dynamic-route model where none is needed
  (the locale set is finite and every page is static) and force the matcher to special-case the
  first segment; **locale-as-second-base-segment** would fragment the one shared route table
  per locale. So the matcher is untouched, and the default locale simply has no prefix.
- *Page shell / layout* (overlaps D6). **The broad layout system stays DEFERRED; resolved
  minimally for the runtime-derive consumers:** chrome that needs runtime data (the language
  switcher, the latest-feed list) ships as **island components authored into content**, reusing
  the existing island hydration — NOT a new build-emitted shell/layout. Only head-level metadata
  is build-emitted: the feed discovery `<link rel="alternate">` and a `<script id="nocms-site">`
  carrying the base-relative URLs of the ② derived files, both injected into `<head>` by the
  build (like the favicon / `head.html`). So a published page hosts these consumers wherever the
  author drops `<LanguageSwitcher/>` / `<LatestPosts/>`, and the build owns only `<head>` — the
  content-tier-layout-vs-emitted-shell question is untouched. The router still provides the
  matched route + payload; it does not own layout.

**Integration seam (for the merge — `@nocms/router` is not wired into anything yet):**
- `@nocms/build` (③): build its route list with `routeTableFromEntries`/`contentPathToRoute`
  from core (its local `contentPathToRoute` has been removed in favour of core's).
- `templates/starter` (①): emit normal `<a href={href(route, base)}>` links (works with zero
  JS); optionally, in a hydrated entry, call `startNavigation(table, { base })` and re-render
  the matched route on `subscribe` for soft navigation. Starter wiring is the integrator's
  follow-up (the parallel lane owns the starter).
- `@nocms/derive` (②): reuse `contentPathToRoute` for route-keyed manifests/feeds/search so
  every tier agrees on one URL for a given content file.

### D6 — Build SSG shape

**Static prerender path: DONE (custom render loop over the one renderer, no Vite SSG).**
`buildSite` (`@nocms/build`) loads `content/**/*.mdx` → routes, parses `theme.tokens` → CSS
vars, builds the component map from `@nocms/components`, prerenders each route via
`prerenderRoutes` → `renderToHtml` (the same renderer the editor previews with, so invariant
#1 holds), and emits clean-URL static HTML (`/` → `index.html`, `/x` → `x/index.html`) with
token CSS inlined in `<head>` and `public/` copied, respecting `base` for project Pages. The
starter's `build` script runs it (`scripts/build.ts`); `bun run build` yields a
view-source-able static `dist/` (real markup, no SPA shell). Chose a render-and-emit loop
over `@preact/preset-vite`'s prerender: the renderer already produces the exact tree, so Vite
SSG would add a second toolchain for no gain on the static path. `@nocms/build` +
`@nocms/renderer` are vendored (node target — they pull the MDX compiler, fine for the CI
build bundle) into the starter so a fork builds with no monorepo (D1) — verified against a
monorepo-less copy.

**Island hydration / client JS — RESOLVED (the interactivity layer over the static path).**
Curated components prerender static; an interactive subset hydrates in the browser, reusing
the one renderer's component model (Preact `hydrate` over the same components — never a second
renderer or component registry). The contract:

- *How an island boundary is declared → the registry `island: true` flag (per-component).* A
  component is interactive because of what it *is*, declared once on its `@nocms/components`
  registry entry (`{ component, island?: boolean }`) — not per usage. **Rejected: per-usage MDX
  annotation** (Astro-style `<Counter client:load/>`). Per-usage would scatter the decision
  across every call site and add an annotation DSL, against the project's component-defined
  philosophy (props-discovery already derives behavior from the component, not from
  annotations). Trade-off accepted: every instance of an island hydrates; per-instance opt-out
  (e.g. a static `<Counter/>` in a context that never interacts) is a future escape hatch, not
  v1. A thin per-usage override could layer on later without changing the marker/hydration
  format.
- *Marker + props format.* At prerender each island root is wrapped in a layout-neutral
  (`display:contents`) `<div data-island="<Name>" data-island-props="<json>">` around the real
  component's SSR output. Props serialization is **JSON in the `data-island-props` attribute**;
  only JSON-serializable props travel. `children` and non-serializable props (functions, VNodes)
  are dropped — children are reconstructed from the marker's SSR HTML at hydration. **v1 limit:**
  islands that need their children (slotted content) re-rendered client-side aren't supported
  yet (the proof island, `Counter`, is configured purely by serializable props); richer
  slot-preserving hydration is a follow-up. Detection/serialization/wrapping live in
  `@nocms/renderer` (`islands.ts`) and are pure (no DOM, no MDX) so they test without a browser;
  `hydrateIslands` is the only DOM-touching seam.
- *Manifest.* `collectIslands(tree, identify)` is the pure VNode-tree walk (names + per-instance
  props) for a consumer holding a resolved tree (the editor). The **prerender path can't walk**
  the tree (an MDX document renders lazily — there's no resolved tree before output), so the
  per-page manifest is read back from the emitted markers (`islandNamesFromHtml`). Both compute
  the same island-name set from the two representations a caller actually has (tree vs HTML).
- *Partial, not full, hydration.* Only island sub-trees ship interactivity; island-free pages
  emit **zero** client JS and stay byte-identical to the static-only output. (Decided against
  whole-page hydration: it would force all content through client JS and defeat the
  view-source-able static guarantee.)
- *Client-JS bundling strategy → bundle once at vendor time (D1), serve a committed artifact.*
  The island client entry (`@nocms/build`'s `island-client.ts`: import the registry +
  `hydrateIslands`, run on load) is bundled to a self-contained browser ESM file at *vendor*
  time in the monorepo — `Bun.build`, `target: browser`, preact **inlined** (Pages serves static
  files, no resolver), tree-shaking the MDX compiler out — and **committed** alongside the
  vendored `@nocms/build` bundle. `buildSite` copies it to `dist/_nocms/islands.js` and injects
  `<script type="module">` only into pages with islands. This keeps the publish path one
  toolchain (the Bun-based render-and-emit loop, no Vite SSG) and self-contained for forks (the
  fork serves the committed bundle, never rebuilds it). **Rejected: bundling at site-build time**
  (re-introduces a per-build bundler step and, in a fork resolving `@nocms/renderer` to the
  node-target vendored bundle, would risk shipping the MDX compiler to readers).
  `nocmsVitePlugins()` exposes the same client entry as a Vite virtual module so the dev server
  and the publish bundle share one island entry.
- *Page shell / layout.* The prerender emits only the content tree. The starter's dev runtime
  (`src/main.tsx`) wraps content in an `App` shell (centered container, body font/color); the
  static output does not, so dev and publish diverge on chrome. Where layout lives (a
  content-tier layout vs. an emitted shell) is unsettled — likely tied to D5. Flagged, not
  guessed.
- *Multi-page routing.* `buildSite` maps `index.mdx`→`/`, `x.mdx`→`/x`, `x/index.mdx`→`/x` —
  enough for the one-page starter. Params, collections, and pagination are D5.

### D17 — Build-assembler portability & Astro capability adoption

Recurring question: should noCMS build on / adopt **Astro** to gain build-time capability
(image pipeline, syntax highlighting, integrations, view transitions, SSR)? Investigated deeply
across renderer, build, editor tree, and components.

**Finding — the publish assembler is already a swappable seam.** preview≡publish is delivered by
*portable contracts*, not the literal engine: the lossless canonical mdast↔MDX round-trip (D2b),
pre-built shared Preact atoms (one registry across all moments), the engine-independent island
marker (`<div data-island data-island-props style="display:contents">`, D6), and runtime token
CSS vars (#3). Verified empirically — a hand-built Preact VNode tree (no `@mdx-js`) emits
byte-identical HTML + markers to the MDX path. So `@mdx-js` / `preact-render-to-string` is an
implementation choice, not an architectural lock; `@nocms/build` already never imports `@mdx-js`
(build → renderer → mdx, one indirection).

**Governing constraint — WYSIWYG taxes content-changing capabilities.** The editor keeps its own
*in-browser* renderer regardless (Astro can't render live per-keystroke on a forked Pages site),
so adopting Astro is *additive* (a second engine), not a replacement. Any publish-side capability
that changes *rendered output* (highlighting, image transforms, GFM, transitions) must be mirrored
in the editor renderer or the canvas lies. Capabilities invisible to the canvas (sitemap, feed,
build speed, prefetch) carry no parity cost — but those are the ones noCMS already owns cheaply in
tier ②.

**Decision — adopt capabilities as libraries; gate framework adoption on a strategic bet.**
- *Default:* harvest wanted capabilities as standalone libraries wired into **both** moments
  (editor renderer + publish) — e.g. `shiki` (highlighting), `sharp`/`unpic` (images, tier ③),
  the native View Transitions API. Buys the feature while keeping the contract + parity under our
  control, self-contained per fork (D1), no framework lock.
- *Adopt Astro-the-framework only if a strategic bet flips:* (a) leaving static-Pages for
  **SSR/hybrid/edge** (the one genuinely framework-level capability, painful to retrofit), or
  (b) **multi-framework authoring** (currently rejected — D14, #1). Absent those, wholesale
  adoption adds a heavy second engine + an editor-parity burden + roadmap coupling, for features
  mostly reachable as libraries.

**Open triggers to revisit:** a decision to support non-Pages/SSR deployment; demand for
multi-framework islands; a *measured* build-time bottleneck at scale (Astro 7 / Sätteri territory —
currently moot: publish is async + free Actions on public repos).

**Follow-ups (not blocking):** add an "assembler-independent output" parity test in
`@nocms/renderer` (the proven swap is the seed) to keep the seam honest; close D2c (deterministic
serialization) so any assembler's diffs stay clean.

## Resolved

### D18 — Pluggable component packs: composition seam + serializable manifest → **RESOLVED.**
The curated library was a single static `registry` object literal in `@nocms/components`;
adding a component meant editing that file and re-vendoring, with no way for a site (or a
plugin) to contribute its own set. The library was decoupled *internally* (the renderer and
editor take the registry by injection, controls derive from schema) but had no *composition*
or *distribution* seam — which is what made it feel hardcoded.

- **Packs are the unit of distribution.** `definePack({ id, blocks, trust })` declares a pack;
  `createRegistry(...packs)` merges them, later packs overriding earlier ones by block name
  (the override seam). The curated set is now the `core` pack; `registry = createRegistry(core)`.
  A site composes its own with `createRegistry(core, myPack)` — no edit to `@nocms/components`.

- **The cross-boundary currency is a serializable manifest, not a schema or a component.**
  `ComponentManifest` = `{ name, displayName, description, category, icon, tags, slots, island,
  controls: ControlDescriptor[], defaults }`. A valibot schema (a function) and a Preact
  component do not survive `postMessage`; a `ControlDescriptor[]` plus plain metadata do.
  `manifestOf`/`registryManifest` derive it (controls via `deriveControls`, plus friendly
  starter defaults). The insert palette and any catalog consume manifests *only* — so a builtin
  component and a future sandboxed plugin component are indistinguishable to them. This is what
  "design for sandbox from day one" means concretely (invariant #8): the seam is in place even
  though the first packs are in-process; wiring `@nocms/sandbox` to supply a render proxy + a
  manifest is additive, not a redesign.

- **`BlockDef` gained catalog metadata** (category/description/icon/tags) so a palette has
  something to show; the insert palette + richer props widgets (D16) make the library visibly
  usable. Both follow-ups it named — site-local distribution and the sandbox→registry wiring —
  are now resolved in **D19**.

### D19 — Pluggable distribution: site-local packs + sandbox component wiring → **RESOLVED.**
D18 built the composition seam (packs + serializable manifest). D19 makes it usable from both
ends: a fork ships its *own* components without the monorepo, and a sandboxed plugin contributes
components across the capability boundary. Full picture in `.claude/rules/component-packs.md`.

- **The site owns the composition root and the client entrypoints.** `@nocms/build` became
  registry-injectable (`buildSite({ registry })`, defaulting to core); the starter has
  `src/registry.ts` = `createRegistry(core, sitePack)`, an example site-local component (`Stat`,
  authored exactly like a curated one — valibot schema → controls), and site-owned
  `island.client.ts` / `editor.client.ts` that compose that registry. `vendor.ts` bundles the
  *site's* client entries (resolving `@nocms/*` to workspace source so the node-targeted vendored
  bundles' node: paths tree-shake out for the browser). A fork adds a component in one place and
  it renders in the reader, the editor palette, island hydration, and the publish prerender —
  no edit to `@nocms/*`. The `block()` helper spares site authors the prop-type variance cast.

- **Sandboxed plugins contribute components by manifest + template, not code.** The pre-existing
  `registerComponent` host method (gated by `components:register`) now has a host-side registrar
  (`createComponentRegistrar`): a plugin sends a `PluginComponentRegistration` (manifest-shaped +
  an HTML `template`); the host validates it (untrusted input — throws on a bad name/template,
  drops malformed controls), and renders it in an **inert sandboxed iframe** (`sandbox=""`, opaque
  origin, no scripts; `{{key}}` props HTML-escaped) so plugin markup never touches the host DOM or
  executes in the host context (invariant #8). `registrar.pack()` composes with `createRegistry`;
  because `BlockDef` carries pre-derived `controls`, the editor renders/lists/configures plugin
  components with no editor changes. **Deferred:** interactive plugin components need a host→guest
  render protocol (the iframe is static-template only in v1); live hot-add into a mounted editor
  needs a registry-update API (`subscribe()` is the hook).

### D20 — No-code component authoring: visual symbols with an encapsulated implementation → **RESOLVED (model; build deferred).**
Non-developers **build** components, not just place them — no code, no build. Two flows,
**specialize** (lock props on one brick) and **compose** (arrange several into a new named unit),
are one gesture: select on the canvas → "Save as component" → prune what stays editable
(**opt-out demotion** — everything exposed by default, locked down to a small opinionated surface;
structural props auto-lock). Authoring new *rendering behavior* (a "new primitive") stays out —
that is the plugin/sandbox path (D14) or a future AI accelerator *atop* compose, never a code
generator. Full spec: `docs/specs/saved-components.md`. Builds on the pack/manifest seam (D18/D19):
a saved component is the owner-authored, trusted twin of a plugin-contributed one.

- **A symbol with proper encapsulation — instances depend on the *interface*, never the
  *implementation*.** The master (in the site pack via `createRegistry`) owns the internal structure
  *and* the interface (exposed scalar props + exposed slots + their defaults), stored as text and
  loaded into the registry at **runtime** (no build — invariant #3). An instance is an ordinary
  **component reference by name** carrying its **exposed interface explicit inline** — so it flows
  through the existing catalog/insert/props-panel/renderer unchanged; the link *is* the element name,
  and an optional `@version` marker (a `data-symbol` annotation read from the MDX AST, not
  necessarily emitted to HTML) only flags instances on an older interface for migration. The
  implementation is never inlined — delete the master and instances keep their interface but lose
  their internals; a saved component is a real dependency. Mechanically it is the owner-authored,
  in-process twin of a sandboxed plugin component (`createComponentRegistrar`, D19): a `BlockDef`
  built from data (pre-derived controls + structure), rendered through the one renderer rather than
  an inert iframe. Build plan + tracer-slice phasing live in the spec.

- **Exposed values are seeds; implementation is by reference; sync is interface-scoped.** An exposed
  value is copied at insert and frozen per instance (editing a master *default* seeds only future
  inserts). Editing the *implementation* touches one file — instances re-render fresh.
  **Auto-sync fires only on an interface change** (rename / add / remove an exposed prop), rewriting
  every instance to the new contract — a wide commit, justified because the contract moved;
  everything else is local or encapsulated, so wide commits are rare. Sync runs live in the editor
  (runtime), persists as a branch-per-session commit (invariant #7, D7), publishes async. **Detach**
  = drop the tag → plain owned blocks. Guardrail: the editor must block hand-edits to the
  locked/internal part of an attached instance (steer to *edit master* or *detach*), else sync
  clobbers them.

- **Slots are first-class interface, not just scalars.** A component's interface = exposed scalar
  props **+ exposed child regions** (`BlockDef.slots`). A slot's contents are per-instance,
  materialized inline, and preserved across auto-sync exactly like exposed values — so saved
  *containers* ("our Card", "our Section with our padding/border") are possible, not just
  fill-in-the-blank presets. This is the line between a real layout component and a section template
  (`component-library.md`).

- **A list is children in a slot — there is no "repeater" primitive.** A card row, a team grid, a
  nav are an exposed slot filled with N child blocks; add / remove / reorder is ordinary block
  editing, and each item is edited via its own props panel. The uniform block tree with container
  slots (D15) already expresses "multiple children" — a repeater would be a redundant second
  mechanism. A per-slot *shape constraint* ("this slot accepts only `Card`") is a possible future
  slot property, not a concept of its own; deferred, not needed for v1.

- **Deferred:** promoted-control rename / group / order, and exposed-value migration when an
  interface change renames or removes a prop; catalog placement and naming/collision rules for the
  site's library pack vs the curated `core` pack.

### D2 — Editor engine architecture → **RESOLVED: bespoke composition over `@nocms/renderer`; MDX-text/mdast is the source of truth**

**Decision.** The editing surface is a **bespoke composition of noCMS's own packages**, not
an adopted visual builder. The live site *is* the canvas: `@nocms/renderer` renders the
MDX→Preact tree in editor mode (annotated with source positions) — the *same* tree the
publish build prerenders — so "what you preview is what you publish" (invariant #1) holds by
construction, with no second renderer or component model. MDX text is the source of truth
(invariant #5); the in-memory model is its mdast tree. The editing surfaces, all over that one
tree (`mountEditor`/`shell.tsx` is the loop):
- *Select* — a canvas click resolves via injected `data-mdx-pos` source offsets → mdast node
  path (`position.ts`), then up to the meaningful node (`selectable.ts`); tracked by
  **index-path** (offset-stable across edits) and drawn with a non-interactive overlay.
- *Configure* — `@nocms/props-discovery` schemas (injected ahead of time — live TS-compiler
  discovery is a build/vendor step, impractical in-browser) drive a control-per-prop panel that
  mutates the JSX node's attributes (`props-panel.tsx`, `jsx-attributes.ts`); never raw JSON
  (invariant #10).
- *Edit text in place* (D2a) — a transient ProseMirror view over a block's mdast inline nodes
  (`@nocms/prose`), serialized back to mdast on commit.
- *Theme* (tokens-as-bricks) — `@nocms/tokens` runtime CSS variables rewritten into one
  `<style>` live; never a rebuild (invariant #3).
- *Persist* — re-serialize mdast→MDX (`mdx-document.ts`, D2b lossless round-trip) and fire
  `onChange`; saving/publishing wires onto that seam (`@nocms/session`, D7).

**Rejected.**
- *Adopt a component visual builder* (Puck, Craft.js, Plasmic, Builder.io) — each disqualified
  by a locked **JSON-tree data model** (against invariant #5: layout is line-mergeable MDX
  text), a **centralized/hosted** editor (against invariant #2: decentralized), or dormancy.
  Kept as UX/architecture references only.
- *A second renderer or component model for the canvas* — violates invariant #1; the whole
  correctness property is one renderer, two moments.
- *ProseMirror / Lexical / Slate as the document source of truth* (D2a) — every WYSIWYG
  framework owns its own JSON model and silently drops inline MDX constructs it has no handler
  for. So the mdast↔PM transformer is **built in-house on ProseMirror core** (vanilla, no
  editor-framework lock), modeling inline MDX atoms as schema atom nodes that survive
  deterministically. TipTap (a wrapper over the same engine) is not adopted.

**Adopted dependencies (the only ones, all MIT-compatible).** ProseMirror core for the prose
widget. A DnD primitive (Pragmatic DnD) for brick insertion is the documented next increment,
not yet wired.

**Resolved sub-decisions.** D2a (prose widget) → ProseMirror-core transient view over mdast
(`@nocms/prose`), lossless round-trip verified. D2b (persist MDX text, not PM JSON) → verified
structurally lossless, stable fixpoint.

**Open follow-up.** D2c — re-serialization currently normalizes cosmetic formatting (e.g.
bullet `-`→`*`); minimizing diff noise so git line-merges stay clean is a deferrable
refinement, not an architecture blocker.

**Post-v1 seams (flagged, not built).** Block-level prose structure (Enter/Backspace block
ops — `isProseEditable` is paragraph+heading only); brick insertion (DnD + a layout-brick
library + AST insert); schema production via `discoverControls` at build/vendor time (the
starter's are hand-authored); fork-vendoring `@nocms/editor` (D1); media picker (D6);
plugin-contributed bricks (D4).

The full research and the implementation map are retained below.

#### D2 — research & implementation detail

**Product vision (Maxime, the north star).** A flexible, versatile website builder that
*feels Figma-like* but targets **non-developers/non-designers**: assemble sites from
pre-built **layouts + components**, with an **opinionated** way of building (e.g. design
**tokens-as-bricks**), every concept understandable with **zero web/design knowledge** —
"standard-user-proof." The cat-next TipTap editor below was a reference for the
**props-discovery philosophy only**, not an editor recommendation.

**Key finding from library research (2026-06): no full builder is adoptable.** Every
component-based visual builder is disqualified for noCMS by a locked JSON-tree data model
(Puck, Craft.js, Plasmic, Builder), a centralized/hosted editor that breaks decentralization
(Builder, Plasmic), or dormancy (Craft.js) — all against noCMS's MDX-text-source / Preact /
decentralized constraints. So the editor is **bespoke composition of packages noCMS already
has**, on top of a few small primitives. The big builders are **UX/architecture references
only**.

**Feature map (capability → what powers it):**
1. *Canvas* — the live site is the editing surface → `@nocms/renderer` (invariant #1) +
   DOM↔mdast mapping via source positions + iframe/shadow sandbox (kills the
   React-context-barrier pitfall).
2. *Insert bricks* — components + pre-built **layout sections** by drag-drop → a DnD
   primitive + a curated layout-brick library (MDX snippets + metadata) + AST insert.
3. *Configure* — friendly property controls → `@nocms/props-discovery` + a control-widget
   set (prop-type → widget); never expose JSON.
4. *Edit text in place* — see D2a.
5. *Design: tokens-as-bricks* — semantic, opinionated token panel + presets → `@nocms/
   tokens` (runtime CSS vars, no rebuild — invariant #3) + a color picker.
6. *Structure* — pages, nav, a layers/outline tree from mdast → `@nocms/core` + routing (D5).
7. *Media* — image upload/picker + alt text → `@nocms/github` + build-tier optimization (D6).
8. *History* — one unified undo/redo over mdast/text (avoid cat-next's per-region isolation).
9. *Save & publish* — branch-per-session + async publish → `@nocms/github`, `@nocms/auth`.
10. *Guardrails* (cross-cutting) — valibot validation + constrained choices → `@nocms/core`.
11. *Plugins* (later) — sandboxed extra bricks/controls → `@nocms/sandbox` (D4).

**The only genuine "adopt a dependency" slots (Preact-feasible primitives):**
- *Canvas drag-and-drop:* **Pragmatic DnD** (`@atlaskit/pragmatic-drag-and-drop`, ~4.7kB
  vanilla, framework-agnostic — top pick) or **dnd-kit/dom** (richer, pre-1.0).
- *Prose text widget:* **ProseMirror core** (vanilla, no framework lock) — see D2a.
- *Small UI:* a color picker; minimal popover/menu primitives (build or vet).

**References to study (do NOT adopt):** **TinaCMS** — the blueprint: edits MDX as an AST in
git, never as a string, self-hosted; **Onlook** — DOM element ↔ source-location mapping for
in-site editing; **Puck** — cleanest field-config + DropZone WYSIWYG UX; **GrapesJS** —
builder panel/trait UX.

**v1 implementation (complete — `bun run verify` green):**
1. ✅ Document seam — `parseMdx`/`serializeMdx` (D2b verified).
2. ✅ Selection mapping core — `position.ts` (`nodeAtOffset`/`deepestNodeAtOffset`/
   `nearestOfType`): a click's source offset → the mdast node path. Pure + tested.
3. ✅ Renderer editor-mode DOM annotation — `@nocms/renderer`'s `renderEditableToVNode`
   (`editable.ts`). Evaluates with `{ development: true }` + a wrapped `jsxDEV`; intrinsics
   get `data-mdx-pos` injected into props, components (which don't forward unknown props)
   are wrapped in a `display:contents` carrier; `line:col → start offset` so the DOM offset
   feeds `nodeAtOffset` directly. Publish path stays clean (tested). Known edge: wrapping a
   component that renders e.g. an `<li>` — `display:contents` keeps layout but not
   HTML-nesting validity; acceptable for v1, revisit if it bites.
4. ✅ Canvas mount — `@nocms/editor`'s `mountCanvas` (`canvas.ts`): renders the annotated
   editable tree into a target and reports the selected mdast node path on click
   (`offsetFromElement`/`selectionAtElement` resolve via `nodeAtOffset`). happy-dom is the
   editor's DOM test env (per-file `@vitest-environment` docblock). Remaining canvas
   refinements: iframe/shadow sandbox for style + React-context isolation, a visual
   selection overlay, and a "selectable granularity" policy (nearest block/component) in
   the editor shell — clicking a block resolves to its first inline child today; the shell
   chooses the meaningful node via the path.
5. ✅ Props panel — `@nocms/editor`'s `jsx-attributes.ts` (pure `getProp`/`setProp`/
   `removeProp` over the JSX node) + `PropsPanel` (`props-panel.tsx`): a friendly control
   per `@nocms/props-discovery` Control, bound to the selected node's attributes; edits
   mutate the node in place and fire `onChange` for the shell to re-serialize + re-render.
   happy-dom tested. Remaining: media control = plain text field (real media picker later);
   the editor shell that wires canvas selection → schema lookup → panel → re-render loop.
6. ✅ **Editor shell loop — `mountEditor` (`shell.tsx`).** Lays out a canvas region beside a
   side panel, keeps one live `MdxDocument` (`parseMdx` once), mounts `mountCanvas`, and on
   select resolves the meaningful node (`selectableNode` — nearest JSX component or block,
   `selectable.ts`), looks up its **injected** schema by component name, and renders
   `PropsPanel`. A panel edit mutates the node in place; the shell re-serializes, calls
   `canvas.update(mdx)`, re-highlights by **index-path** (`indexPathOf`/`nodeAtIndexPath`,
   offset-stable across edits — raw offsets shift), and fires `onChange(mdx)`. Schemas are
   injected, not discovered live (`discoverControls` parses TS source via the compiler — a
   Node step, impractical in-browser). Canvas gained a structural **selection overlay**
   (`highlight(indexPath)`, non-interactive layer) and now `preventDefault`s clicks (an
   editing surface selects, never navigates). Full click→panel→edit→live-update→`onChange`
   loop unit-tested (happy-dom) and **browser-verified** in the starter.
7. ✅ **Tokens-as-bricks panel — `TokensPanel` (`tokens-panel.tsx`).** Edits design tokens as
   semantic, opinionated, human-labeled choices (brand color, fonts, spacing, radius) grouped
   by concept, never raw var names; an edit emits updated tokens + flat source + CSS-var
   block. Wired into `mountEditor` behind an optional `tokens` source: the shell rewrites one
   `<style>` live on each theme edit (no rebuild — invariant #3) and surfaces the flat text
   via `onTokensChange`. Added `formatTokens` to `@nocms/tokens` (the missing flat-text
   serializer, inverse of `parseTokens`, round-trip tested). Browser-verified live theming.
8. ✅ **Starter `?edit` mount + browser verification.** `?edit` lazily imports `src/edit.tsx`
   (separate entry) → `mountEditor` with the starter's content, registry, injected schemas,
   and tokens; the reader path and the prerender build (`scripts/build.ts`) are untouched.
   `@nocms/editor` is a **workspace devDep** of the starter (dev-only; not in the reader
   bundle, not vendored yet).

9. ✅ **In-place prose editing — `@nocms/prose` wired into the shell (post-merge).**
   Double-clicking a paragraph/heading (`isProseEditable`, `prose-edit.ts`) mounts a transient
   `mountProseEditor` view over the block's DOM, seeded with the block's mdast inline children;
   the widget's `onChange(nodes)` splices `block.children` live and fires the shell `onChange`.
   The canvas is **not** re-rendered mid-edit (that would tear the view out) — only on commit
   (a click outside the block, or Escape), which re-serializes, re-renders via the one renderer,
   and re-selects the block by index-path. The canvas's new `suppressWhen` guard hands clicks
   inside the live editor to ProseMirror untouched (no `preventDefault`, no reselect). The
   active view is exposed via `EditorHandle.proseView()` (the escape hatch for a future
   formatting toolbar). Full loop unit-tested (happy-dom) and **browser-verified** (double-click
   → type → Escape re-renders the edited text through the one renderer).

**Open seams for the merge (this lane):**
- *Prose: block-level structure.* The widget edits one block's *inline* content; creating /
  splitting / merging / deleting blocks (Enter at a paragraph end, Backspace-merge) and
  editing list items or blockquote bodies are not wired yet — `isProseEditable` is paragraph
  + heading only. A block-structure layer over mdast is the next prose increment.
- *Schema production.* Schemas are injected; the starter's are **hand-authored** in
  `edit.tsx`. The real source is `discoverControls` over component TS at build/vendor time,
  shipped as a `Record<name, ComponentSchema>` — unbuilt, out of scope this lane.
- *Fork-vendoring the editor.* `@nocms/editor` isn't in the vendor `PACKAGES`, so `?edit`
  works only in the monorepo. Vendoring it (browser target; it pulls the MDX compiler — heavy,
  loads only in edit mode) so a fork is self-contained is the D1 follow-up.
- *Editor content source.* `edit.tsx` **inlines** the MDX as text because the build lane's
  `@mdx-js/rollup` plugin (enforce:pre, in the off-limits `vite.config.ts`) compiles every
  `.mdx` request — `?raw` included — so a raw-text import is impossible without touching it.
  The real editor loads content as text from the **GitHub API** (the repo is the database),
  so this is a dev-harness shim, not the intended path.
- *Dev-flow wrinkle (D1).* `predev` regenerates `vendor/*`, but bun's `file:` store keeps the
  copy from the last `bun install`, so a new vendored export (e.g. `formatTokens`) needs a
  `bun install` to surface in Vite dev. Harmless for forks (bundles are committed,
  never regenerated); a monorepo-dev paper cut worth smoothing later.

---

WYSIWYG over MDX with lossless round-trip. Reference studied (props-philosophy only,
a POC): cat-next TipTap editor at
`/Users/maximedepachtere/project/papernest/cat-next/apps/front/features/editor`.

**What the cat-next engine does well (worth adopting):**
- *Descriptor-driven, zero-config.* Component authors write ordinary typed
  components; editability is inferred from the TS prop types — no annotation DSL.
  noCMS already has this as `@nocms/props-discovery`, and better: at runtime via
  the TS compiler API, so there is no build-time descriptor generation step.
- *Render the real component as the canvas.* The node view renders the actual
  component for instant WYSIWYG preview. noCMS already has the matching piece —
  `@nocms/renderer.renderToVNode` is the one renderer and is meant to be the canvas.
- *Three edit surfaces:* a props panel (from the descriptor), click-to-edit on
  rendered text, a native content slot for children, and nested editors for
  rich-text props. Good UX to mirror.

**Where noCMS must diverge (hard constraint):**
- cat-next's source of truth is **ProseMirror/TipTap JSON** (a tree AST). That
  violates noCMS invariant #5 — layout/content is **MDX text, line-mergeable, no
  JSON tree**. So we cannot persist ProseMirror JSON.

**Proposed model — MDX-AST as the document, MDX text as the artifact:**
- Parse MDX → mdast (remark + `mdast-util-mdx`) as the in-memory model; persist by
  serializing back to MDX text (`mdast-util-to-markdown` + mdx). Text is the source
  of truth, so round-trip is structural, not a lossy re-derivation.
- Preview by feeding the same MDX/AST to `@nocms/renderer` (reuse the one renderer —
  satisfies the preview===publish guarantee for free).
- Map visual selection → AST via remark **source positions** (`node.position`),
  NOT by stringifying values and DOM-searching (the POC's fragile click-to-edit).
- Edit component props with `@nocms/props-discovery` controls, mutating the JSX
  node's attributes in the AST, then re-serialize. Single undo over the AST/text
  (avoid the POC's per-region isolated undo).

**Pitfalls flagged in the POC to design around:** DOM value-search binding (use
positions), isolated rich-text undo (unify), React-context barrier across node
views (each preview island is its own root — keep components context-light or
provide context at the canvas root), heuristic async-render timing.

**Sub-decisions still open:**
- D2a — prose editing widget. **DECIDED: ProseMirror core as a transient view over mdast,
  with CodeMirror as a scaffold/code-view (option B-with-A-scaffold).** A prose paragraph
  parses to mdast inline nodes that interleave standard marks
  (`strong`/`emphasis`/`inlineCode`/`link`/`text`) with **MDX inline atoms** —
  `mdxJsxTextElement` (inline `<Badge/>`) and `mdxTextExpression` (`{expr}`). Preserving
  those atoms while editing is the whole problem. The widget sits behind a small region-edit
  seam (block source range in, edited MDX text out), so the two parts compose.

  No WYSIWYG framework treats mdast as the source of truth — every one (ProseMirror, Lexical,
  Slate) owns its own JSON model and *drops inline constructs it has no explicit handler
  for*; generic converters (`prosemirror-markdown`, `@lexical/markdown`) confirm the
  data-loss trap. So a mdast-authoritative editor must be **built, not adopted**, on
  **ProseMirror core directly** (vanilla, no UI-framework lock, no third-party editor
  framework in the dependency path). We do not use TipTap (a wrapper over the same engine).

  - **(A) CodeMirror 6 source + live preview — scaffold / power-user code view.** Edits the
    MDX text, so the verified `mdx-document` round-trip stays authoritative and inline atoms
    are literally just text (lossless by construction). It shows raw markup, so it is *not*
    the non-dev surface — it's the low-risk scaffold to stand up the editor loop, and stays
    as an optional code view. (MDX-aware highlighting is DIY; CommonMark/GFM is turn-key.)
  - **(B) ProseMirror core as a transient edit view over mdast — the non-dev WYSIWYG
    surface.** Build the PM doc *from* a prose span's mdast and serialize *back* to mdast on
    commit, so mdast stays the truth (inverting Milkdown's PM-as-truth default). Because we
    own the schema, `mdxJsxTextElement` / `mdxTextExpression` are modeled as inline **atom**
    nodes and survive deterministically. This delivers the Figma-like "click and type like a
    doc" feel *and* preserves inline atoms. The bidirectional mdast↔PM-schema transformer
    for prose spans is the entire risk — prototype + round-trip-test it the way D2b proved
    the mdast↔MDX round-trip. References to mine (not depend on): Milkdown's
    `$node`/`parseMarkdown`/`toMarkdown` transformer design and MDXEditor's inline-vs-flow
    `jsxComponentDescriptor` split.

  **Build status (`@nocms/prose`) — IMPLEMENTED (option B, the ProseMirror widget).** A new
  standalone package operates purely on mdast inline nodes (`PhrasingContent[]` in/out), so it
  depends only on mdast types + ProseMirror core — no dependency on `@nocms/editor` (clean
  boundary). Pieces:
  - `proseSchema` — a PM schema for a prose span: `doc` (inline content) + `text`, marks
    `link`/`em`/`strong`/`code`, and inline **atom** nodes `mdxJsxText` / `mdxExpression` (each
    carries its source mdast node verbatim in an attr, rendered as a non-editable chip). Mark
    declaration order *is* the canonical serialization nesting (link ⊃ emphasis ⊃ strong),
    matching remark.
  - `mdastInlineToDoc` / `docToMdastInline` — the pure bidirectional transformer. **Lossless
    round-trip verified** over 15 fixtures (text, nested marks, links ±title, inline code as a
    leaf-shaping mark, breaks, JSX/expression atoms incl. `data.estree`, a dense mixture).
  - `mountProseEditor(target, { nodes, onChange })` → `{ view, destroy() }` — transient PM
    view with span-scoped history + a mod-b/i/\` mark keymap; emits updated mdast on every
    doc-changing transaction. happy-dom tested via applied transactions.

  **Preservation decisions / caveats (the host should know):**
  - *Mark nesting is normalized.* PM marks are an unordered set, so the relative nesting of
    strong/emphasis/link is canonicalized to schema order on serialize. Matches remark for the
    common case; inverse-authored nesting (`**_x_**`) round-trips to the canonical form —
    semantically identical, structurally normalized. Inherent to mark-based editing; accepted.
  - *Nothing is dropped.* Any inline mdast type we don't model explicitly (inline `image`, raw
    `html`, …) is preserved verbatim as an opaque `unknownInline` atom rather than discarded.
  - *Inline JSX atoms are opaque in v1* — an `mdxJsxTextElement`'s children round-trip exactly
    but aren't separately editable yet (the element is one chip). Revisit if in-atom editing
    is wanted.
  - *Host seam:* the editor shell extracts a block's `children`, calls `mountProseEditor`, and
    splices `onChange`'s `PhrasingContent[]` back into the document before re-serializing.
- D2b — **VERIFIED.** Toolchain: `unified` + `remark-parse` + `remark-frontmatter`
  + `remark-mdx` + `remark-stringify`, one processor for both directions
  (`@nocms/editor`'s `parseMdx`/`serializeMdx`, see `mdx-document.ts`). A
  parse→serialize→parse cycle is **structurally lossless** on JSX flow/inline
  elements, all attribute kinds (string, `={expr}`, boolean shorthand, `{...spread}`),
  flow/text expressions, comments, and frontmatter, and serialization is a stable
  fixpoint (`mdx-document.test.ts`, 14 cases). The *only* change is cosmetic
  formatting normalization (e.g. list bullet `-`→`*`) — which is D2c's problem, not
  a losslessness failure. Conclusion: persisting MDX text (not ProseMirror JSON) is
  sound; the riskiest assumption holds.
- D2c — how AST mutations re-serialize while preserving unrelated formatting
  (minimize diff noise so git line-merges stay clean).

### D4 — Sandbox engine → **iframe-only for v1; QuickJS-in-WASM documented as a defense-in-depth escalation, not built.**

The boundary that invariant #8 demands — plugin code never reaches the GitHub token, the
host DOM, or the network by default — is **already provided by the browser's iframe**, an
OS-vendor-hardened isolation primitive. A child iframe with `sandbox="allow-scripts"` and
**no** `allow-same-origin` runs the plugin in a *null-origin* realm: it cannot read the host
DOM, host cookies/`localStorage`, or make same-origin/credentialed requests, and it shares no
globals with the host. The token lives only in the host/auth context and is **never** posted
across — so the asset the boundary protects isn't even present in the realm a plugin runs in.
The only channel is a transferred `MessagePort`, over which a **capability-scoped postMessage
broker** dispatches a fixed, whitelisted method set keyed by `PluginManifest.capabilities`.
Network is denied *structurally*, not just by refusing a method: when the `network` capability
is absent the frame is created with a CSP whose `connect-src 'none'` blocks `fetch`/XHR/WS at
the platform layer.

- **iframe-only (chosen for v1).** Zero added runtime dependency — the sandbox *is* the
  platform (satisfies the "prefer platform/stdlib; justify any dep" bar). Pure ① tier: no WASM
  to download, no second toolchain. Plugins can render real UI (their own DOM inside the
  frame), which the design requires ("sandboxed iframe (UI)"). The host-side broker — the part
  that actually enforces capabilities — is identical no matter what runs inside the frame, so
  it is the whole v1 surface and is unit-testable as pure protocol logic over injected ports.
- **iframe + QuickJS-in-WASM (rejected for v1, kept as the escalation path).** QuickJS
  (`quickjs-emscripten`, MIT — the MIT bar is *not* what disqualifies it) compiled to WASM
  runs a JS interpreter *inside* the frame, so plugin *logic* sees only values explicitly
  marshalled into its realm — not even the frame's own `window`/`fetch`/DOM. That is genuine
  defense-in-depth, but it buys little against *this* threat model: the token is absent from
  the frame regardless, and an iframe escape capable of defeating null-origin isolation is a
  browser 0-day that a userland interpreter does not meaningfully harden against. It costs a
  ~1MB+ WASM payload on the ① tier, a value-marshalling boundary, and a split execution model
  (QuickJS for logic + iframe for UI) — disproportionate for v1. It becomes worth it only for
  a future need iframe-only can't serve: running untrusted *logic with no UI realm of its own*,
  or a hard second containment layer for a higher-risk capability. Documented now so it can
  layer **behind the same broker** later without reshaping the protocol — mirroring how Search
  recorded sharding and Router recorded the framework-router rejection rather than over-building
  v1.

**What v1 ships (`@nocms/sandbox`, host side):** a pure capability **broker** (`broker.ts`) that
maps each `HostApi` method to its required `Capability` and refuses — without invoking the host —
any call whose capability the owner did not grant (deny-by-default; the dispatch table is a fixed
whitelist, so a plugin cannot reach an unlisted host property); a pure **protocol** (`protocol.ts`,
typed request/response messages + guards); a **port** seam (`port.ts`) wiring the broker to any
`MessagePort`-like channel (round-trip tested with a `MessageChannel` under happy-dom); a pure
**frame policy** (`frame.ts`, `frameSandboxPolicy` → sandbox attr + CSP, network-deny-by-default)
applied by the one DOM edge (`createSandboxFrame`); and a small guest **client** (`client.ts`) so
plugin code speaks the protocol without ever holding a token. `loadPlugin` composes them at the
edge. Side effects (DOM, the port transfer) sit at the boundary; the protocol core is pure.

### D8 — Site config seam → **a valibot-validated `nocms.config.json`, owned by `@nocms/core`**

The single source of truth for the deployment-wide knobs every tier must agree on:
`base` (deployment base, e.g. `/repo/`), `siteUrl` (absolute origin), `locales`
(`locales[0]` = default), and `feed` (`{ collections, title, description? }`). Lives in
`@nocms/core` (`site-config.ts`) because build (③), derive (②), and the runtime (①) all
read it — the invariant "if two packages need the same thing it belongs in core." Shape:
a `SiteConfig` type + a valibot `parseSiteConfig` (mirroring `parseCollectionDef`) + a
Node-only `loadSiteConfig(root)` that reads `nocms.config.json` or returns the zero-config
default (`base: "/"`) when absent (a minimal site needs no config file). `FeedConfig` was
relocated from `@nocms/derive` to core (single definition; derive re-exports it — a
type-sourcing change only, no output-shape change to D3's jobs).

**Format fork (the genuine decision).** Weighed a **flat one-token-per-line text file**
(like `theme.tokens`) against a **typed JSON validated by valibot** (the pattern core
already uses for `CollectionDef`/`schema.ts`).
- **Chosen: JSON + valibot.** Config is small, structured (the nested `feed` object, the
  `locales`/`collections` lists), machine-read by tooling, and rarely hand-edited. JSON
  expresses nesting and lists natively, `JSON.stringify(…, 2)` puts list items
  one-per-line so small configs still diff/merge cleanly, and valibot gives the same
  typed-parse-at-the-boundary core already applies to collections. The config is also
  inert data — readable in ② (Node), ③ (Node), and ① (browser `fetch`) alike.
- **Rejected: flat text file.** Invariant #5 ("text, not JSON") scopes itself to **layout
  and tokens** — artifacts that are large, frequently edited, and merged line-by-line, so
  a JSON *tree* would make diffs unreadable. Site config is the opposite (small, nested,
  machine-read), so the invariant's spirit does not extend to it. A flat token-style file
  would have to invent a dotted-key nesting convention for `feed` and a list convention for
  `locales`, reinventing a config language against the data's actual shape.
- **Rejected: a typed TS/JS config module.** Would need bundling/evaluation to read across
  tiers and could execute arbitrary code; JSON is inert and tier-portable.

**Adapters (no field is redeclared per tier).** `@nocms/derive`'s `deriveInputFromConfig`
maps the config + loaded entries onto `DeriveInput` (`locales`/`siteUrl`/`feed`);
`@nocms/build`'s `buildSite` reads the config from the site root itself (the same way it
already reads `theme.tokens`/`head.html`/`editor.json`) and derives `base`/`siteUrl`/`feed`
from it. So `base`/`siteUrl`/`locales`/`feed` originate in exactly one place.

**Runtime handoff.** `core`'s `siteRuntime(config, base)` derives a `SiteRuntime`
(`{ base, feedUrl?, translationsUrl? }`, URLs base-relative) that the build embeds per page
as `<script id="nocms-site">`; the ① consumers read it (`readSiteRuntime`) to locate the
derived files. The build also emits the feed discovery `<link rel="alternate">` (absolute).

**②→③ served-path — COORDINATION (CI lane owns it).** The runtime contract is only that the
derived files are served **base-relative at the site root** (`/feed.json`,
`/i18n/translations.json`, …) — the URLs `siteRuntime` emits and the sitemap/feed already use.
*Where the publish Action writes them* (and how the build picks them up) is the CI session's to
finalize; the starter demo commits them to `public/` (which the build copies to `dist/` root)
so it works on checkout without the Action, and `bun run derive` regenerates them. The repo
`.gitignore` notes ② artifacts belong on "a dedicated path/branch" — reconcile the demo's
`public/` choice with that when the Action lands. Biome ignores the committed artifacts (they
are generated, like `dist`/`vendor`).

### D1 — Package distribution model → **vendor a built bundle**
A fork of `templates/starter` lives outside the monorepo and can't resolve
`workspace:*`. **Decision: vendor built `@nocms/*` bundles into the template.** Most
aligned with invariant #2 (fully decentralized — the fork is self-contained, nothing
the project runs can break a site, no external resolution at install or runtime).
Rejected: npm publish (adds a live dependency on external infra) and runtime-fetch
(reintroduces a hosted artifact the site depends on).

Mechanics (`templates/starter/scripts/vendor.ts`): each needed package is built into a
self-contained, installable `file:` package under `templates/starter/vendor/<pkg>/`
(`index.js` via `Bun.build`, browser ESM, `preact` external; `index.d.ts` tree via
`tsc --emitDeclarationOnly`; a small `package.json`). The starter depends on them via
`file:./vendor/<pkg>` — pure node resolution, no Vite alias or tsconfig paths, so the
in-repo starter is identical to a fork. The bundles are **committed** (a fork has no
monorepo to build from). `predev`/`prebuild` run the vendor script: in the monorepo it
regenerates (contributor package edits flow in on next run); in a fork the sources are
absent so it's a no-op and the committed bundles are authoritative.

Currently vendored: `@nocms/tokens`, `@nocms/components` (browser target — the reader
runtime), plus `@nocms/renderer`, `@nocms/build` (node target — the CI build tooling, which
pulls the MDX compiler). `vendor.ts` takes a per-package `target`. As the editor mounts (D2),
add its package to `PACKAGES`. Known follow-up: the bundle imports
`preact/jsx-dev-runtime` (Bun's default) rather than the production runtime — correct
but slightly heavier; switch when a production-JSX build path is wired.

### D7 — Editing-session & content-sync model → **RESOLVED**

The orchestration that turns the low-level `@nocms/github` + `@nocms/auth` pieces into the
usable spine: **sign in → load repo content → branch-per-session → commit → publish**.

**Where the orchestration lives → a new `packages/session`** (depends on github + auth + core).
Rejected: extending `@nocms/github`. The GitHub client is the minimal browser seam over
`api.github.com`; folding auth + content orchestration into it would pull `@nocms/auth` into
github's dependency graph and blur a clean boundary. A dedicated package keeps each seam
minimal (`index.ts` is the contract) and lets the orchestration be tested over an **injected**
client with no real network. `connectGitHub` is the one place auth and github meet.

**Content-tree loading → the recursive git-trees API, then per-file blob fetch.** `listTree`
issues one `GET /git/trees/{branch}?recursive=1` (cheap on rate limit — a single request lists
the whole repo); `loadEntries` then claims each MDX blob for the first collection whose glob
matches and fetches its source via the contents API (`readFile`), one request per file.
Rejected: the **contents API for listing** (one request per directory — more round-trips, worse
on rate limit). Tradeoff accepted: N content fetches for N MDX files; fine at starter scale.
A **truncated** tree (GitHub caps the recursive listing at 100k entries / 7MB) is refused with
an error rather than silently returning partial content — escalation to a paginated subtree
listing or a batched GraphQL blob fetch is the documented large-repo follow-up. A small,
dependency-free glob matcher (`glob.ts`) avoids a glob library in the browser client.

**Token-store interface → `SessionStore { get?(): Session|null; set(session): void }`,
async-friendly.** `createTokenProvider` returns the current access token, refreshes the
rotating token just before `isExpired` (respecting skew), and persists the rotated session
through `store.set` so a reload resumes signed in. `get` is optional: when present it seeds the
provider and a **fresher** persisted session (rotated in another tab) is adopted. One shared
in-flight refresh prevents concurrent requests from each consuming the (single-use) refresh
token. A PAT (`expiresAt: Infinity`, no refresh token) never refreshes.

**Publish trigger → merge the session branch into the publish target; the push is the
trigger.** `publish()` calls the github client's `publish` (a `/merges` REST merge) into the
forked-from branch (default `base.branch`, e.g. `main`); pushing to that branch is what fires
the **existing** Pages/Actions deploy workflow. Rejected: a client-side **`workflow_dispatch`**
call — it couples the client to a named workflow and needs the `actions` permission scope,
against invariant #2 (nothing the project runs may break a site; a universal "push to publish
branch" trigger is the most decentralized). DEFERRED: if a site protects its default branch so
a direct client merge is blocked, an explicit `workflow_dispatch` (or a PR-then-merge) path is
the escalation — flagged, not built (no consumer yet).

**Session-branch naming & cleanup → `nocms/session-<now()>`, deleted after a successful
merge (best-effort).** The name is derived from the injected clock (unique per session) and is
overridable via `branchName`. After the merge, `publish()` deletes the session ref
(`deleteBranch`); a failed delete is swallowed — the content already published, so cleanup must
not surface as a publish failure (and everything is public per invariant #9, so a stray branch
is cosmetic, not a leak). Rejected: leaving session branches to accumulate.

**Serialization seam → `serializeEntry` in `packages/session`, the inverse of core's
`parseEntry`.** The MDX body stays **verbatim text** (the source of truth — invariant #5); only
YAML front-matter is re-emitted (via the `yaml` lib core already uses). The editor's richer
body re-serialization (mdast→MDX, D2b) is *not* reachably exported from a package this lane may
touch (`@nocms/editor` is off-limits), so the session also accepts ready `FileChange[]` via
`stage()` for callers that hold serialized text. core was left untouched — `serializeEntry`
lives in session rather than appending a writer to core, keeping the new surface in this lane.

**Deferred sub-decisions (recorded, decision-free core built around them):**
- *Resume an existing session branch.* `open()` always **creates** a fresh branch. Re-opening a
  named, already-existing branch (crash recovery, multi-device) would need an ensure-or-create
  path — deferred; reuse the `EditingSession` object within a session for now.
- *Stale-head / conflict handling on commit & merge.* `commit` uses GraphQL
  `createCommitOnBranch` with `expectedHeadOid` (it throws on a stale head) and `publish`'s
  `/merges` can 409 on a conflict. Retry/rebase/surfacing strategy is the integrator's to
  define — the seam throws a `GitHubError` the host can catch.
- *Large-repo tree escalation* (paginated subtree vs batched GraphQL blob fetch) — see above.

### D9 — Editor controls derivation → **RESOLVED: schema-introspection over a per-component valibot props schema, not TypeScript-source parsing.**
Invariant #10 said controls are derived by *parsing component TypeScript prop types*. That
holds for the curated first-party library (its `.ts` source is on hand) but has two structural
limits the editor and plugins hit:
- **Plugins can't be parsed.** A sandboxed plugin component (invariant #8) ships as compiled
  JS — there is no TypeScript source at runtime to derive controls from. TS-source parsing
  cannot give a plugin component an editor panel; schema-introspection can, because the schema
  travels *with* the component and is read at runtime inside the sandbox.
- **Bare types are control-poor.** A `string` can't say it is a color, a URL, or rich text, so
  a parser maps everything to a text box unless branded — and branding in raw TS is awkward.

**Resolution.** A component declares a **valibot** schema for its props; the component's prop
type is `v.InferOutput<typeof Schema>`, so the schema *is* the single source of truth and types
cannot drift from controls (this *strengthens* invariant #10's intent — "no annotation DSL that
drifts" — rather than weakening it). Controls are derived by **introspecting the schema object**:
each entry's base type maps to a base control (`string`→text, `number`→number, `boolean`→toggle,
`picklist`→select, nested `object`→group), and **meta-types** attach a richer control via
`v.metadata({ control: 'color' | 'url' | 'image' | 'range' | 'richtext' | … })` (or `v.brand`),
e.g. `v.pipe(v.string(), v.metadata({ control: 'color' }))` → color picker. The thin optional
field-config stays as an *override-only* escape hatch, never the source.

**Why valibot, not zod.** `core` already standardizes on valibot (content-collection schema; the
`nocms.config.json` schema in D8). Adding zod would be a second schema library for a job already
solved (dependency bar + "don't add a second pattern"). Valibot is introspectable, has
`InferOutput`, and supports `brand`/`metadata` for meta-types — it covers the need.

**Consolidation.** `core` already maps `FieldDef` → controls for collection fields. Schema-driven
component props means **one** schema→control derivation serves both component props *and*
collection fields; that mapper belongs in `core`, consumed by `@nocms/props-discovery` (reworked
from TS-parsing to schema-introspection) and the editor's props panel.

**Cost (accepted):** reworks `@nocms/props-discovery`'s core and updates invariant #10's wording
in `CLAUDE.md` from "parsing component TypeScript prop types" to "introspecting a component's
valibot props schema (`InferOutput` keeps types and controls a single source)."

### D10 — Onboarding repo bootstrap → **RESOLVED (mechanism): template-generate via a GitHub App; the template ships its own Pages workflow. Exact App permissions pending verification (see `docs/research/github-app-onboarding.md`).**
The zero→live flow (Phase 0, `docs/specs/onboarding.md`) bootstraps a user's site from a
stateless launcher page. Three sub-decisions:

- **Repo creation → template-generate, not fork.** `POST /repos/{template}/generate` creates an
  *independent* repo: clean history, no "forked from" badge, private-able later, no upstream
  coupling. This matches D1 (sites are self-contained and vendor their `@nocms/*` bundles; they do
  not pull upstream via git), so the one thing a fork buys — upstream merges — is not wanted. The
  starter repo (`templates/starter`) is marked a **template repository**. Fork is the fallback.

- **Identity → a GitHub App (verdict confirmed).** Per `docs/research/github-app-onboarding.md`:
  repo-from-template via `POST /repos/{template}/generate` **works with a user-to-server (PKCE)
  token**; creation is authorized at the *account level* by **Administration: write**, not by the
  (nonexistent) new repo being pre-installed. Required App permissions: **Administration R/W** (create
  repo), **Contents R/W** (commits), **Pages R/W** (enable Pages), **Actions R/W** (dispatch/poll
  the deploy), **Metadata R** (forced). The two consent moments collapse into **one screen** via
  "Request user authorization (OAuth) during installation"; repo creation works immediately after.
  All needed endpoints are **CORS-enabled** (browser-callable) — only the code→token exchange stays
  in the relay. Token lifetimes confirmed unchanged (8h / 6mo single-use rotating). The fine-grained
  PAT remains the zero-relay power-user fallback (invariant #7).
  *Two residual empirical checks (owner action):* (a) whether a user token can write Contents/Pages
  on a `/generate`d repo under a **"selected repositories"** install, or whether a
  `PUT /user/installations/{id}/repositories/{repo_id}` add-call is needed — **defaulting installs
  to "All repositories" sidesteps this**; (b) that `POST /pages {build_type:"workflow"}` succeeds on
  a brand-new repo with no prior Pages config.

- **Pages → the template ships the deploy workflow AND the launcher makes one enable call
  (corrected).** Research overturned "no separate enable call": owning a `deploy-pages` workflow does
  **not** auto-enable Pages — the `github-pages` environment must exist first. So the flow is: the
  generated repo carries `.github/workflows/*` (`actions/deploy-pages`, source = GitHub Actions),
  **and** the launcher makes one `POST /repos/{owner}/{repo}/pages {build_type:"workflow"}` to create
  the environment. This is why **Pages R/W** is in the permission set above.

### D11 — Content conventions: singletons, navigation vocabulary, collection storage, slug-change → **RESOLVED (recommended defaults; reversible).**
Resolves the open questions surfaced by the Phase 2 structure spec (`docs/specs/structure.md`).
All four keep layout/nav as line-diffable text (invariant #5) and the repo as the database (#4).

- **Non-routable singletons → a `content/globals/` directory.** Header, footer, and an optional
  explicit nav live as `content/globals/header.mdx` etc. The route mapper skips `globals/`. Chosen
  over a `_`-prefix (cryptic) or a `route: false` frontmatter flag (invisible until every file is
  parsed) — a directory is explicit, scannable, and needs no per-file parse to know what's routable.

- **Navigation → derived-by-default, explicit-override.** The menu is derived from per-page
  frontmatter so it can't drift from the pages that exist, using a small vocabulary owned by `core`:
  `nav.label` (string), `nav.order` (number), `nav.parent` (route ref, for nesting), `nav.hidden`
  (boolean). When
  curation is needed, an optional `content/globals/nav.mdx` holds a `<Navigation>` component tree
  that overrides the derived menu — layout as text, one renderer (invariant #1/#5), explicitly **not**
  a JSON array in config.

- **Collection definitions → `nocms.config.json` (D8, valibot).** `CollectionDef`s are structural
  config, not page content, so they live in the config seam; entries live as content files under the
  collection's directory, and entry forms are driven by D9's schema→control mapper reading `FieldDef`
  (one mapper, two callers).

- **Slug change → atomic internal rewrite, optional external tombstone.** Renaming a page moves the
  file and rewrites internal links in the *same* commit (structure spec). External inbound links
  can't be server-redirected (Pages has no redirect rules), so a rename may optionally leave a
  client-redirect tombstone (a tiny HTML at the old path) — **off by default** to keep the tree
  clean; opt-in when an established URL must not break.

### D12 — Dark mode in the flat token file → **RESOLVED (recommended default; reversible): a `@mode` qualifier compiling to scoped CSS variables, one source of truth.**
Phase 3 (`docs/specs/design-theming.md`) needs dark mode without breaking invariants #3 (runtime,
no rebuild) or #5 (flat one-token-per-line is canonical). Resolution: extend the flat file with a
**mode qualifier** — `color.primary@dark = …` lines sit alongside the base `color.primary = …` —
which `@nocms/tokens` compiles to scoped overrides (`[data-theme="dark"] { --color-primary: … }`).
A root class toggles the active mode, defaulting to `prefers-color-scheme`. Only color/shadow tokens
take mode variants; spacing/type/radius ramps are mode-invariant and never qualified.

This keeps **one canonical source** (no parallel dark-theme file to drift), stays line-diffable
(#5), and restyles instantly via CSS-var swap (#3). Themes (D-? presets in Phase 3) and modes are
orthogonal: a preset supplies base + `@dark` values together.

**Cost (accepted, bounded):** `parseTokens` learns the `@mode` suffix and `toCssVariables` emits the
scoped block. Alternatives rejected: separate `tokens.dark` file (drifts, two sources — violates #5
spirit), media-query-only with no override (can't theme), JSON theme object (not text). The exact
qualifier syntax (`@dark` vs `[dark]` vs a `:dark` segment) is the one detail to finalize when the
tokens-package extension is implemented.

### D13 — v1 policy resolutions: SVG sanitization, new-site crawl posture, publish conflict resolution → **RESOLVED.**
Three small but real policy forks the Phase 4/5/6 specs surfaced, decided with the project owner.

- **SVG uploads → allowed, sanitized by an established library (never hand-rolled).** Per owner
  direction ("proper libs, don't try to implement weaknesses"): `.svg` uploads are permitted but
  passed through a maintained, battle-tested sanitizer — **DOMPurify** (MIT, browser-side) with an
  SVG profile that strips `<script>`/`<foreignObject>`, event handlers (`on*`), and external
  references — before commit. We do **not** hand-roll SVG sanitization; reusing a maintained
  sanitizer is the same "don't reinvent the hard, security-critical part" stance as D3 (MiniSearch),
  and respects invariant #8. Raster uploads keep the resize-to-WebP path (Phase 4).

- **New-site crawl posture → discouraged until first publish.** A freshly generated site ships
  `noindex` (placeholder/seed content shouldn't land in search results); the first real Publish
  flips it to indexable. Framed as crawler hygiene, not privacy (invariant #9). The `robots.txt`
  question (template-shipped vs derive-emit) stays a thin implementation choice under this posture.

- **Publish conflict resolution → ask only on same-section overlap.** When live has advanced under
  an open draft: auto-rebase and publish when draft and live touched *different* sections; prompt
  the user only when the *same* section diverged. Resolves the policy D7 explicitly left to the
  integrator — low friction in the common case, a prompt only on a genuine conflict.

### D14 — Plugin contribution model & render boundary → **RESOLVED: data-in/data-out across the sandbox; the host's one renderer paints plugin output.**
Per `docs/specs/plugins.md`, reconciling invariant #8 (plugin boundary) with #1 (one renderer) and
D4 (iframe-only sandbox). Most plugin marketplace/discovery stays deferred; the *seam* is decided.

- **Contribution types — three of four are pure data.** Plugins contribute components, sections
  (compositions of trusted components), themes/tokens, and custom control-kinds. Sections, tokens,
  and the *schema half* of a component cross the seam as **data, no code execution**; only component
  **render** and custom **control renderers** run in-sandbox. Keeping most contribution as data is
  what keeps the boundary clean.

- **Render boundary → guest emits a tree, host renders it.** A plugin component is a pure
  `(props) → tree-of-known-components`; that serializable tree crosses postMessage and the host's
  **single renderer** paints it (preview + `preact-render-to-string` at publish). Rejected
  guest-renders-into-its-own-iframe: it breaks invariant #1, can't prerender to static HTML, and
  tokens wouldn't flow. Symmetric with the controls path: *schema in as data, render-tree out as
  data*.

- **Interactivity is the v1 cut line.** Static plugin components prerender cleanly and are the v1
  path. Runtime-interactive plugin components would need their sandboxed iframe persisted as an
  island in the published page — a documented escalation, not v1.

- **Capabilities map 1:1 to contributions** (`components:register`, `content:read` (read-only),
  `tokens:contribute`, `layout:contribute`, `network` off-by-default); grant = `requested ∩
  approved` per the real `loadPlugin`. The GitHub token never crosses (#7).

- **Distribution mirrors D1:** the plugin bundle is vendored + committed, with an `integrity` hash
  and the grant recorded in `nocms.config.json` — self-contained and reproducible, no marketplace.

### D15 — Editor block model: one uniform block tree, container slots, canonical MDX → **RESOLVED.**
The editor's core model, settled in design discussion. Refines `authoring-shell` + `component-library`.

- **Everything is a block.** Content, layout, and plugin-contributed components are all blocks in
  one uniform tree — same insert palette, same schema-derived props panel (D9), same canvas
  behaviour. The curated library is just "the first-party blocks"; a plugin block (D14) is
  indistinguishable from a native one.

- **Containers are blocks with slots.** A container (`Stack`/`Grid`/`Section`, or a plugin's
  Tabs/Carousel) declares named slots that hold child blocks. The block owns the *surrounding
  structure*; the host owns the *children* (the user's content — selectable, inline-editable,
  drag-reorderable, living in the user's MDX). This is what lets a plugin ship a new container
  *without touching user content or breaking the one-renderer/security boundary* (invariants #1,
  #8): the block renders slot markers, the host fills them. It is what makes "layout as a block"
  succeed and extensibility safe.

- **Slots freeform by default, optionally typed later.** No accepted-type constraint in v1; the
  slot declaration is designed so a block can later opt into "accepts only X" without a format change.

- **Deep, composable, no free positioning.** Editing goes deep — you can recompose *inside* a
  section — but always through typed containers, never absolute/pixel positioning (responsive-safe
  by construction; reaffirms the component-library rule and the Wix-Studio anti-pattern).

- **Text is a block.** A paragraph/heading is a block like any other, but the text block's
  *interior* is the rich-text (prose) editor — uniform on the outside, prose's special needs
  contained within.

- **Persisted as canonical MDX.** The block tree and the on-disk JSX are the same tree, two views
  (the editor never makes anyone read text). A **deterministic serializer** writes a fixed
  *generated-MDX house style* — stable attribute order, consistent indentation, one fixed
  slot/children syntax — so the same tree always yields the same text. This is the load-bearing
  property: it delivers both readability *and* clean, churn-free git diffs (a non-deterministic
  serializer is what quietly breaks "git-backed" editors). The editor owns content formatting the
  way Biome owns code formatting. Lives at the parse↔serialize seam (builds on D2, reaffirms #5).

### D16 — Build strategy: vertical tracer-slice before breadth → **RESOLVED.**
Build the thinnest end-to-end loop first, on a pre-existing repo, then widen.

- **The slice:** open an existing repo's page → it renders on the canvas → select a block, edit
  text inline → insert a block via `/` → reorder → change a prop → serialize to canonical MDX (D15)
  → commit → publish to Pages → see it live. ~5 blocks (`Section`, `Stack`, `Heading`, `Text`,
  `Image`/`Button`). **No** onboarding, media, collections, structure, SEO, design panel, or plugins.

- **Why:** it retires the existential risk — *does visual editing over MDX feel good AND round-trip
  cleanly* (the hardest, most-integrated part, including the D15 serializer determinism) — on day
  one, and produces something to actually *feel* and judge in weeks. Everything else is additive
  breadth that does not change the core loop.

- **Reframes the roadmap:** M0–M5 (`ROADMAP.md`) is no longer "complete each layer in order" but
  "prove the spine, then widen it" — the milestones become breadth added to a working core, not
  blind gates. The audience is *motivated people who want to run their own site*, so onboarding
  (breadth) genuinely comes last.