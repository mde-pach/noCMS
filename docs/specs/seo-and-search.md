# Spec — SEO & Search (Phase 6)

The finish that makes a site *findable*: per-page metadata, social cards, on-site search, sitemaps
and feeds. The heavy lifting already exists — `@nocms/derive` (② tier) ships `search.json`
(MiniSearch, D3), `sitemap.xml`, `feed.json` (JSON Feed), i18n bundles, and a manifest as committed
files. So Phase 6 is **almost entirely editor controls (①) that write the inputs and runtime
consumers (①) that read the artifacts** — not new derivation. Grounded in `@nocms/core` frontmatter
parsing, `@nocms/derive`, and `nocms.config.json` (D8).

> **North star:** good SEO is the *default*, not a chore. A non-dev who writes a page with a heading
> and a first paragraph already has a sane title, description, and social card — the controls only
> ever *override* what the content already implies. Nothing here adds a build step the ② tier didn't
> already pay for (invariant #6).

## 0. Where SEO lives (tier map)

| Concern | Stored as | Computed where | Tier |
|---|---|---|---|
| Per-page title / description / canonical / OG | page **frontmatter** (text, `@nocms/core`) | `<head>` emitted at prerender | control ①, emit ③ |
| Site defaults (siteUrl, default OG, social) | `nocms.config.json` (D8) | read by derive + build | ① / ② |
| Search index | `search.json` | derive (MiniSearch) | ② |
| Sitemap / feed / i18n bundles | `sitemap.xml` / `feed.json` / `i18n/*` | derive (gated on config) | ② |
| Search box / language switcher | runtime islands | browser | ① |

The only ③ touch is emitting the static `<head>` — legitimately ③ ("SEO-ready static HTML",
invariant #6), since crawlers need meta in the prerendered HTML. Everything else is ① control + ②
artifact + ① consumer. No work moves *up* a tier.

## 1. Per-page SEO controls

Each page carries optional SEO frontmatter — text, line-diffable, living with the page:
`title`, `description`, `canonical`, `og.title`, `og.description`, `og.image`, `noindex`.

- **Sane auto-defaults, zero effort.** When a field is absent, it resolves from content at
  prerender: `title` ← first H1 (then `nocms.config` site title as suffix), `description` ← first
  paragraph (trimmed), `og.title`/`og.description` ← the resolved title/description, `og.image` ←
  site default. A non-dev who never opens the SEO panel still ships correct, content-derived meta.
- **Controls are override-only.** An "SEO" fold in the page's settings (inspector, with nothing
  selected) surfaces each field with its *derived value shown as placeholder* — so the user sees
  what they'd get and only types to override. This is L0/L3: present but never in the way.
- **Live preview.** The fold shows a Google-result + social-card preview of the *resolved* values
  (derived or overridden), so the abstract becomes concrete. (Render target for Claude Design.)
- **`noindex`** is a single toggle; it adds the meta + omits the page from the sitemap at derive
  time. (Honors invariant #9: this is crawler hygiene, *not* privacy — the page is still public.)

The build assembles `<head>` from resolved values; the editor only ever writes frontmatter.

## 2. OG images

- **Generated OG images are DEFERRED** (VISION.md deferred list) — no render-an-image-per-page
  pipeline in v1.
- v1 path: `og.image` is **picked with the Phase 4 media picker** (an uploaded/committed image) or
  falls back to a **site-default OG image** set once in `nocms.config.json`. So every page has a
  social card with zero per-page effort, and a custom one is one click.
- When generation lands later, it slots in as the `og.image` default source — no control change.

## 3. Search UI (runtime island)

A search box is a **runtime island** (component-library philosophy) — the ① consumer of the ②
`search.json`:

- On first focus (lazy), it `fetch`es `search.json` and calls `MiniSearch.loadJSONAsync(json,
  SEARCH_OPTIONS)` with the **same `SEARCH_OPTIONS`** the derive job used (D3 — build/runtime share
  them, so ranking matches the index). Queries run client-side with BM25 + fuzzy + prefix.
- **UX:** a `Search` component placed like any other (header, dedicated page); typing shows ranked
  results (title + excerpt + route from `storeFields`), keyboard-navigable, Enter routes via
  `@nocms/router`. Empty/again states handled; no network after the one index fetch.
- **Island, not always-on JS** (invariant #1): static until interacted with; the reader who never
  searches pays almost nothing.
- Degrades honestly: if `search.json` is absent (search not enabled / corpus below threshold), the
  component renders nothing rather than erroring.

## 4. Sitemap, feeds, robots — thin controls only

These artifacts already derive; Phase 6 adds only the switches that gate them:

- **`siteUrl`** (in `nocms.config.json`, D8) — the absolute-URL base. `sitemap` and `feed` jobs are
  **no-ops until it's set** (D3 — they need absolute URLs). The onboarding/settings UI must prompt
  for it early, since several features are dark without it. Surface this as "your site's address"
  in plain terms.
- **Feeds** — enabling a feed for a collection is a small config edit (`feed: { collections, title,
  description? }`, D3); the UI is a per-collection "publish an RSS/JSON feed" toggle that writes that
  config. The derive job does the rest.
- **`robots.txt`** — a thin static file (template-shipped or a trivial derive emit) pointing at
  `sitemap.xml`, with a global "discourage search engines" toggle that flips it to `Disallow: /`
  (again hygiene, not privacy). Per-page exclusion is §1's `noindex`.

No new derivation logic — Phase 6 only writes the config these jobs already read.

## 5. i18n surface (light)

- **Full i18n authoring UI is DEFERRED** (VISION.md). The ② tier already emits per-locale bundles
  and `i18n/translations.json` (D3) when `locales` declares a default + ≥1 translation.
- **In scope for v1:** a **language-switcher island** that consumes `translations.json` to render a
  page's other-locale URLs — the ① consumer of the existing ② artifact, mirroring the search island.
  It appears only when translations exist (the job is a no-op otherwise), so monolingual sites never
  see it.
- **Out of scope:** the editor flow for *authoring* a translation (locale-directory content, D3) —
  deferred; for now a translation is added by creating the `content/<locale>/…` file directly (L4).

## 6. Progressive disclosure

| Altitude | In SEO/Search | Trigger to reach it |
|---|---|---|
| **L0 Content** | Good meta with zero input (auto-derived); drop a `Search` block | Just write the page |
| **L1 Compose** | Place `Search` / language-switcher components | Insert from the library |
| **L2 Design** | (inherited — search/switcher theme via tokens) | Tokens panel |
| **L3 Structure** | Per-page SEO overrides; enable a collection feed; `siteUrl` | Page "SEO" fold; settings |
| **L4 Extend** | Edit frontmatter / `nocms.config.json` / add a locale file directly | "Edit as MDX" / "Edit config" |

The rule holds: a non-dev gets SEO for free and never opens the panel; a power user overrides exact
tags — same frontmatter underneath.

## 7. Anti-patterns to avoid

1. **Forcing SEO input before publish** — defaults must make the fields optional; never a gate.
2. **Re-deriving at build what ② already produced** — search/sitemap/feed are ②; don't recompute in
   ③ (invariant #6).
3. **Always-on search JS** — the index loads lazily on interaction; search is an island.
4. **Divergent ranking** — runtime must reuse the derive `SEARCH_OPTIONS` (D3), not its own config.
5. **Implying `noindex`/robots = privacy** — it's crawler hygiene; the repo is public (#9). Wording
   must never suggest hiding content from people.
6. **Per-page OG-image generation in v1** — deferred; don't build it, pick or default instead.
7. **A second metadata store** — SEO lives in frontmatter + config, the existing text sources, not a
   new sidecar.

## 8. Open questions → Claude Design exploration targets

- The **SEO fold** UX — showing derived values as placeholders + the live Google/social-card preview
  without cluttering page settings.
- The **`Search` component** — inline box vs command-palette-style overlay; result list density;
  empty/no-result states.
- The **language switcher** form factor (dropdown vs inline list) and where it sits.
- **`siteUrl` capture** — folding "your site's address" into onboarding so feeds/sitemap aren't
  silently dark, in plain language.
- **Crawl posture → RESOLVED (D13):** a new site ships `noindex` and the first real Publish flips it
  to indexable — placeholder content stays out of search. (`robots.txt` template-shipped vs
  derive-emit remains a thin implementation choice under this posture.)

## Relationship to existing seams

- `@nocms/derive` — already emits `search.json`, `sitemap.xml`, `feed.json`, `i18n/*`, `manifest`;
  Phase 6 feeds their config and consumes their output, adding no derivation.
- `@nocms/core` — frontmatter parsing (`parseFrontmatter` / `ParsedDocument`) holds per-page SEO;
  `site-config.ts` (D8) holds `siteUrl`, default OG, `locales`, `feed`.
- `@nocms/build` — assembles the static `<head>` from resolved frontmatter at prerender (the one ③
  touch).
- `@nocms/components` / `@nocms/editor` — the `Search` and language-switcher islands and the SEO
  fold; controls derived via D9 where applicable.
- `@nocms/router` — search results and switcher route through it; `isActiveRoute` for switcher state.
