# Spec — Structure (Phase 2)

The L3 altitude: pages, navigation, global content, and collections — the *shape* of the site
beneath the page-by-page authoring of Phase 1. This is power-user territory that a non-developer
never has to open, yet it is one tab away in the same shell. Grounded in `@nocms/core`'s
`route.ts` (`contentPathToRoute` / `routeToContentPath`) and `site-config.ts` (D8), `@nocms/router`
(route table, breadcrumbs), and assuming D2 (mdast/MDX text is the source of truth), D7 (every
operation is a commit on the session branch), and D9 (the schema→control mapper).

> **North star:** the site's structure is *legible in the repo* — a page is a file, a route falls
> out of its path, nav and globals are plain composed text. The Structure UI is a faithful view
> over that file tree, never a database that drifts from it (invariant #4). You can always read the
> structure by reading the folder.

## 0. Anatomy

The **Structure** tab (left rail of the authoring shell) holds four surfaces, in increasing rarity
of use:

- **Page tree** — the routable pages, mirroring the `content/` directory.
- **Navigation** — the visible menu(s), edited visually.
- **Globals** — header, footer, and site metadata edited once, applied everywhere.
- **Collections** — repeating structured content (blog, team, products), the deepest surface.

A non-dev lives in Phase 1's canvas; they enter Structure only to add a page or rename one. The tab
opens to the page tree; nav/globals/collections are progressively deeper.

## 1. Page management

A page **is** a content file; its route **falls out of** the file path — there is no separate route
registry to keep in sync (invariant #4). The page tree is a direct rendering of the `content/`
subtree, using `@nocms/core`'s canonical mapping:

- `content/index.mdx → /`, `content/about.mdx → /about`, `content/posts/index.mdx → /posts`,
  `content/posts/a.mdx → /posts/a` (`contentPathToRoute`). Nesting in the tree = nesting on disk.
- `@nocms/router` builds its `RouteTable` from this set; matching a `RoutePath` resolves to the
  entry. The Structure tree and the router read the *same* mapping, so what you see is what resolves.

**Operations** (each one commit on the session branch, D7):

- **Create** — pick a name → slug-validated → write `content/<slug>/index.mdx` with seed frontmatter
  + a starter section (so a new page is never an empty void; mirrors the section-library philosophy).
  The route appears the instant the file exists.
- **Rename / change slug** — moves the file to the new `routeToContentPath`. The forward mapping is
  many-to-one (`/posts ← posts.mdx` *or* `posts/index.mdx`), so the editor always writes the
  `index.mdx` form on create to keep nesting open.
- **Duplicate** — copy to a new slug; useful for "another page like this one."
- **Delete** — remove the file, but **find inbound internal links first** (scan content for `href`s
  to that route) and warn, rather than silently breaking them.

**Link integrity on slug change.** Internal links to the old route would break. Because everything
is in the repo (invariant #4), the editor **rewrites every internal reference in the same commit** —
a find-and-replace over content `href`s, atomic with the move. *External* inbound links can't be
rewritten; see open questions for the tombstone-redirect option.

**Everything is public (invariant #9).** There are no private pages. An "unpublished" page exists on
the session/working branch but isn't merged to the published branch yet (the draft model is Phase 5,
not access control). The Structure UI must never imply a page can be hidden from the world.

## 2. Navigation

Nav must stay **text, line-diffable** (invariant #5). The site-config seam already drew the line:
invariant #5 scopes to *layout and tokens* (large, hand-merged), while small flat machine-read
config is legitimately JSON. A **menu is layout**, not deployment config — so it must be text. Two
tiers, both text:

- **Derived by default (zero-config).** Each page declares its menu presence in **frontmatter** —
  `nav.label`, `nav.order`, `nav.parent`, `nav.hidden` — which is MDX text, line-diffable, and lives
  *with the page*. The menu is computed from the page tree + these fields (the same shape as the
  derived `manifest`). Editing nav visually = reordering a tree whose moves write `nav.order` /
  `nav.parent` back into each page's frontmatter. The page set is the source of truth; nav falls out
  of it and cannot drift from the pages that exist.

- **Explicit, when a curated menu is needed** (external links, custom grouping, ordering decoupled
  from the page hierarchy) — the menu is authored as a **singleton content file** containing a
  composed `<Navigation>` tree (`<NavLink>` / `<NavGroup>` components), edited in the *same*
  authoring shell and serialized to line-diffable JSX. A menu is then just more composed layout —
  one renderer, one component model (invariant #1), no second mechanism. **Not** a `nav` array in
  `nocms.config.json`: that would put layout in JSON, against invariant #5.

**Breadcrumbs & active state** come free from `@nocms/router` (`breadcrumbs`, `isActiveRoute`) —
the nav editor wires components to routes; the runtime resolves active/ancestor state per page.

## 3. Global / singleton content

Content that appears on every page splits cleanly along the same text-vs-config line:

- **Header & footer = singleton content files** (`content/globals/header.mdx`, `content/globals/footer.mdx`)
  holding composed component trees. They are *layout* — large, hand-edited, line-merged — so they are
  **text** (invariant #5), edited in the ordinary authoring shell, and composed into every page by
  the renderer via a layout slot (invariant #1: the same tree previews and publishes). Edit once,
  applied everywhere, because there is one file.

- **Site metadata = `nocms.config.json`** (valibot, D8): title, description, social handles, default
  OG — small, flat, machine-read, rarely edited. This is exactly the config the site-config seam was
  built for; it is *not* layout, so JSON is correct here.

**Non-routable convention → RESOLVED (D11): a `content/globals/` directory.** Singletons and
partials live under `content/globals/` (`header.mdx`, `footer.mdx`, optional `nav.mdx`) and the
route mapper skips that directory — chosen over a `_`-prefix (cryptic) or a `route: false`
frontmatter flag (invisible until every file is parsed). A directory is explicit, scannable, and
needs no per-file parse to know what's routable.

## 4. Content collections in the UI

`@nocms/core` already models collections: `CollectionDef` + `FieldDef` + valibot schema +
`parseCollectionDef` / `validateEntryData`. The UI adds two surfaces on top, no new model:

- **Define a collection** (rare, L3) — a schema editor where each field is a `FieldDef` (kind, name,
  required, …). A collection groups entries under `content/<collection>/*.mdx`. Definitions are
  machine-read schema (like site-config), validated by valibot.
- **Edit entries** (routine, L0/L1) — entries are ordinary MDX content files; the entry form's
  controls are **the same D9 schema→control mapper** that drives component props, here reading the
  collection's `FieldDef` set. *Reuse, not reinvention*: one mapper, two callers (component props,
  collection fields), living in `core`. Meta-types (`color`, `image`, `url`, `richtext`) apply
  identically.

A non-dev never defines a collection; they only fill entries, which feel like filling a tidy form.
Defining the schema is the deepest L3 act — and even it is just editing typed fields, not code.

## 5. Progressive disclosure

| Altitude | In Structure | Trigger to reach it |
|---|---|---|
| **L0 Content** | Fill a collection entry's fields | Open an entry — feels like a form |
| **L1 Compose** | Edit header/footer like any page | Open a global in the canvas |
| **L2 Design** | (inherited — globals theme via tokens) | Tokens panel |
| **L3 Structure** | Page tree, nav reorder, define a collection | "Structure" tab |
| **L4 Extend** | Edit frontmatter / `nocms.config.json` / `<Navigation>` MDX directly | "Edit as MDX" / "Edit config" |

The rule holds: a non-dev reorders pages by dragging a tree; a dev edits the frontmatter that drag
wrote — **same files underneath**. You never have to go up a layer to get something done.

## 6. Anti-patterns to avoid

1. **A route/sitemap registry separate from the files** — drifts from `content/`; violates #4. Routes
   must derive from paths.
2. **Nav as a JSON array in config** — puts layout in JSON, against #5; also silently drifts from the
   pages that actually exist.
3. **Silent slug changes** — renaming must rewrite internal links (and warn on inbound ones), never
   leave dangling references.
4. **Implying private pages** — everything is public (#9); "unpublished" ≠ "hidden".
5. **A bespoke field-control system for collections** — reuse D9's mapper; do not fork a second one.
6. **Empty new pages** — seed a starter section, consistent with insert-then-own.
7. **Globals as a magic config blob** — header/footer are editable *content*, not opaque settings.

## 7. Open questions → Claude Design exploration targets

- **Non-routable convention** — RESOLVED (D11): `content/globals/` directory, skipped by
  `contentPathToRoute`.
- **Explicit nav format** — confirm the `<Navigation>`/`<NavLink>`/`<NavGroup>` component-tree
  singleton as the curated-menu file shape.
- **Standardized `nav.*` frontmatter vocabulary** in core — which keys (`label`, `order`, `parent`,
  `hidden`) are canonical, and whether they belong in the core frontmatter schema.
- **CollectionDef storage** — where collection *definitions* live (in `nocms.config.json`, a dedicated
  `collections` schema file, or per-collection) — core has the schema but not the storage location.
- **External inbound links on slug change** — accept breakage vs leave a client-redirect tombstone
  page (Pages has no server redirects).
- *Prototype in Claude Design:* the **page tree** (drag-reorder, nesting affordance), the **nav
  editor** (tree that writes frontmatter vs the explicit menu), the **collection schema editor**, and
  how Structure stays invisible until summoned.

## Relationship to existing seams

- `@nocms/core` — `route.ts` (`contentPathToRoute` / `routeToContentPath` / `href`) is the page↔route
  mapping; `site-config.ts` (D8) holds site metadata; `CollectionDef` / `FieldDef` / schema model
  collections; the D9 schema→control mapper lives here, shared.
- `@nocms/router` — builds the `RouteTable` from the content set; `breadcrumbs` / `isActiveRoute`
  power nav state.
- `@nocms/editor` — the canvas that edits globals and frontmatter; the Structure tab is its left rail.
- `@nocms/session` — every create/rename/delete is a commit on the session branch (D7).
- `@nocms/derive` — the menu/manifest derivation (② tier) consumes the same `nav.*` frontmatter; the
  Structure UI and the derived artifacts read one source.
