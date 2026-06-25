# @nocms/core

Shared types and the structured-content collection schema. The vocabulary every other package speaks: content models, token shapes, repo coordinates, capability descriptors. Runtime validation via valibot.

It also owns the cross-tier seams every other package agrees on:

- **Route mapping** (`route.ts`): `contentPathToRoute`/`routeToContentPath`/`href`/`normalizeRoutePath`, `routeFromPathname` (strip the deployment base off a browser pathname), and `localeLinks` (a page's other-locale links from a translations manifest).
- **Site config** (`site-config.ts`): `SiteConfig` (`base`/`siteUrl`/`locales`/`feed`) with `parseSiteConfig` (valibot, like `parseCollectionDef`) and the Node-only `loadSiteConfig(root)` reading `nocms.config.json`. `siteRuntime(config, base)` derives the `SiteRuntime` the build embeds and the runtime reads. See `DECISIONS.md` D8.

The public API is `src/index.ts` — depend on that, not internals. Architecture invariants and conventions live in the repo `CLAUDE.md`.
