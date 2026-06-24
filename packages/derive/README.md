# @nocms/derive

The ② batch tier: precompute features that are a function of the whole corpus and tolerant of staleness — search index, i18n bundles, content manifest, taxonomies, feeds. Output is just more files the site reads at runtime. Kept off session branches.

The public API is `src/index.ts` — depend on that, not internals. Architecture invariants and conventions live in the repo `CLAUDE.md`.
