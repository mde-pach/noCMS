# @nocms/components

The curated, props-discoverable Preact component library composed visually in the editor. Each component's props are plain typed Preact props so props-discovery derives controls automatically.

Most primitives are static. A component that needs client interactivity is an **island**, declared by `island: true` on its registry entry (e.g. `Counter`); the build prerenders it, then the island client hydrates it in the browser. See `.claude/rules/islands.md`.

### Runtime consumers of the ② derived files

Two islands read the batch-tier artifacts (`@nocms/derive`) at view time, locating them via the `<script id="nocms-site">` config the build embeds (read with `readSiteRuntime`):

- **`LanguageSwitcher`** fetches `i18n/translations.json` and renders the current page's other-locale links via core's `localeLinks` (the locale is an ordinary leading path segment, so no router is needed).
- **`LatestPosts`** fetches `feed.json` and lists the most recent items.

Both render nothing until their artifact is present, so they are inert on a site that produced none. Author them into content (`<LanguageSwitcher/>`, `<LatestPosts/>`) — they take no page-supplied props.

The public API is `src/index.ts` — depend on that, not internals. Architecture invariants and conventions live in the repo `CLAUDE.md`.
