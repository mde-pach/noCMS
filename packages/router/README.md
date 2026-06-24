# @nocms/router

The ① runtime routing model for noCMS. It turns the site's content entries into a
pure, matchable route table, and offers an optional lightweight History-API
navigation surface for soft (no-reload) navigation.

## The seam

- **Pure model (DOM-free):** build a route table from `CollectionEntry[]` (or raw
  route paths) and match an incoming URL pathname to a route. No `window`, no
  `document`, no `history` — unit-testable as plain functions.
- **Navigation surface (the only side-effecting edge):** an optional client router
  built on the History API, kept behind a thin seam so the pure model never depends
  on a DOM.

The canonical content-path ↔ route mapping is **not** duplicated here — it lives in
`@nocms/core` (`contentPathToRoute`, `routeToContentPath`, `href`,
`normalizeRoutePath`) because build (③), derive (②), and this runtime (①) all need
it. This package re-exports those helpers for convenience.

See the package source and `DECISIONS.md` (D5) for the full design.
