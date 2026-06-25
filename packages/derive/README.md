# @nocms/derive

The ② batch tier: precompute features that are a function of the whole corpus and tolerant of staleness — search index, i18n bundles, content manifest, feeds. Output is just more files the site reads at runtime. Kept off session branches.

The public API is `src/index.ts` — depend on that, not internals. Architecture invariants and conventions live in the repo `CLAUDE.md`; format decisions (search engine, i18n declaration, feed shape) are recorded in `DECISIONS.md` under D3.

## Shape

A `DeriveJob` is `{ name, run(input) }` where `run` takes a `DeriveInput` and returns `DerivedArtifact[]` (`{ path, contents }`) — a pure function of the corpus, no side effects. `deriveAll(input)` runs every job in `jobs` and concatenates their artifacts. Each job is conditional on its required inputs, so a job with nothing to do returns `[]` — `jobs` stays a safe default list whatever a site has configured.

```ts
interface DeriveInput {
  entries: CollectionEntry[];   // the whole corpus
  locales?: string[];           // i18n: locales[0] is the default
  siteUrl?: string;             // deployed origin incl. project-Pages base
  feed?: FeedConfig;            // { collections, title, description? }
}
```

`locales`/`siteUrl`/`feed` are the deployment-wide knobs of the **site-config seam** (`@nocms/core`'s `SiteConfig`), so a caller builds the input from the one config instead of assembling it loosely: `deriveInputFromConfig(config, entries)`. `FeedConfig` is defined in core (re-exported here for back-compat). A CI Action loads `nocms.config.json` via `loadSiteConfig`, reads the corpus into `entries`, and calls `deriveAll(deriveInputFromConfig(config, entries))`.

## Jobs

| Job | Runs when | Output |
| --- | --- | --- |
| `manifestJob` | always | `manifest.json` — every entry's route + frontmatter; the runtime's nav/link index |
| `searchJob` | always | `search.json` — a serialized MiniSearch index the runtime loads with `MiniSearch.loadJSONAsync(json, SEARCH_OPTIONS)` |
| `sitemapJob` | `siteUrl` set | `sitemap.xml` — absolute URLs per the sitemaps.org protocol |
| `i18nJob` | `locales` has ≥2 entries | `i18n/<locale>.json` (one per locale) + `i18n/translations.json` |
| `feedJob` | `siteUrl` **and** `feed` both set | `feed.json` — a JSON Feed 1.1 document |

Every URL is derived from core's shared `contentPathToRoute`, so search results, the sitemap, i18n links, and feed items all name a page with the same URL the runtime router uses.

### i18n

Content declares a translation by **where the file lives**: the default locale (`locales[0]`) is authored at the content root, every other locale under its own directory.

```
content/about.mdx        → /about      (default locale, e.g. en)
content/fr/about.mdx     → /fr/about   (fr)
```

Two files are translations of each other when their locale-stripped path matches. `i18n/<locale>.json` is that locale's content index (`{ locale, entries: [{ key, route, path, data }] }`); `i18n/translations.json` (`{ defaultLocale, locales, groups: [{ key, translations: { <locale>: <route> } }] }`) links each page to its other-locale URLs so the runtime can render a language switcher. Limitation: the default locale must live at the root, not under `content/<defaultLocale>/`.

### feed

A JSON Feed 1.1 document for chronological content. `feed.collections` selects which collections syndicate. Per item (all fields tolerant of missing frontmatter): `title` ← `data.title` (else filename); `date_published` ← `data.date` then `data.published` (RFC-3339; absent/unparseable → omitted); `summary` ← `data.summary` then `data.description`; `content_text` ← the MDX body reduced to plain text; `id`/`url` is the absolute page URL. Items sort by date desc (dateless last, then by URL) for clean committed output.

## Consumers (① runtime)

The artifacts are served as plain files at the site root (base-relative) and read at runtime:

- `i18n/translations.json` → `@nocms/components`'s `LanguageSwitcher` (via core's `localeLinks`).
- `feed.json` → `@nocms/components`'s `LatestPosts` (and any feed reader).
- `search.json` → loaded with `MiniSearch.loadJSONAsync(json, SEARCH_OPTIONS)` (`SEARCH_OPTIONS` is exported here; a runtime search-box consumer is a follow-up — see below).

The build locates these for the runtime by embedding a `<script id="nocms-site">` with their base-relative URLs.

## Follow-up

`deriveAll` is not yet wired into a GitHub Action — running these jobs and committing their artifacts (served from the site root, e.g. `public/`) is build/CI plumbing, owned elsewhere. A runtime **search box** that loads `search.json` is not built: it needs MiniSearch + `SEARCH_OPTIONS` without pulling the ②-tier `@nocms/derive` (and its remark/MDX deps) into the reader bundle, so `SEARCH_OPTIONS` (and the MiniSearch dependency) should move to a low tier first — flagged, not forked.
