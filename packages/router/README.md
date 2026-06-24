# @nocms/router

The ① runtime routing model for noCMS. It turns the site's content into a pure,
matchable route table, and offers an **optional** dependency-free History-API
navigation surface for soft (no-reload) navigation.

**Navigation model (D5): static multi-page is the default.** Every page is
prerendered to static HTML (D6) and served by GitHub Pages, so a plain
`<a href>` is a real page load with zero routing JS — the most robust,
most decentralized option. Soft navigation is a progressive enhancement a site
opts into; it is never required.

## The seam

The package is two layers with a hard line between them:

- **Pure model (DOM-free):** build a route table and match a URL pathname → route
  + params. No `window`, `document`, or `history` — plain, unit-testable functions.
- **Navigation surface (the only side-effecting edge):** `startNavigation` binds to
  the History API and intercepts link clicks. Its DOM/History access is injected
  (`options.window`), so even it tests without a real browser.

The canonical content-path ↔ route mapping is **not** here — it lives in
`@nocms/core` because build (③), derive (②), and this runtime (①) all need one
shared convention. This package re-exports `contentPathToRoute`,
`routeToContentPath`, `normalizeRoutePath`, and `href` for convenience.

## Public API

```ts
// — mapping (re-exported from @nocms/core) —
contentPathToRoute(repoPath)        // content/posts/a.mdx → /posts/a
routeToContentPath(routePath)       // /posts → content/posts/index.mdx (canonical)
normalizeRoutePath(path)            // adds leading slash, strips trailing
href(routePath, base?)              // join a deployment base → an <a href>

// — pure route model —
routeTableFromEntries(entries)      // CollectionEntry[]  → RouteTable<CollectionEntry>
routeTableFromPaths(paths)          // (RoutePath|string)[] → RouteTable<RoutePath>
createRouteTable(defs)              // RouteDef<T>[]       → RouteTable<T>  (general form)
matchRoute(table, pathname, base?)  // → RouteMatch<T> | null

// — optional navigation surface —
startNavigation(table, { base, window? })  // → Navigation<T>
//   .current()  .navigate(to, { replace }) .subscribe(fn) .destroy()
```

`matchRoute` strips `base` first (so project-Pages deployments match), normalizes
trailing slashes, decodes percent-encoded params, and returns the **most specific**
route (static segments beat `:param` at the same depth), or `null` for not-found.

## How each tier consumes it

**① `templates/starter` (runtime).** Emit ordinary links — they work with no JS:

```tsx
import { href } from "@nocms/router";
<a href={href("/posts/a", base)}>A post</a>   // base = "/<repo>/" or "/"
```

Optionally enable soft navigation in a hydrated entry:

```ts
import { routeTableFromEntries, startNavigation } from "@nocms/router";
const table = routeTableFromEntries(entries);
const nav = startNavigation(table, { base });
nav.subscribe((match) => render(match));       // re-render the matched route
```

**③ `@nocms/build`.** Build the route list from content with the same mapping the
runtime uses (`routeTableFromEntries` / `contentPathToRoute`), so preview, build,
and runtime cannot disagree on a content file's URL. (Follow-up: migrate build's
local `contentPathToRoute` to core's.)

**② `@nocms/derive`.** Reuse `contentPathToRoute` to key manifests, feeds, and the
search index by route, so every tier names a given content file with one URL.

## Dynamic params

The matcher supports `:param` segments (`/posts/:slug`), but the **content-derived
table is purely static** — each content file is its own route. `:param` exists so
the derive/build tier can emit collection/pagination/i18n routes later without a
matcher redesign. Generating those routes, and i18n locale prefixes, are deferred
(see `DECISIONS.md` D5).
