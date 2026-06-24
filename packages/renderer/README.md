# @nocms/renderer

THE single rendering engine. Renders the MDX→Preact component tree. Universal: the exact same tree runs live in the browser (editor preview) and is prerendered to static HTML in Node at publish (preact-render-to-string). One component model, one renderer — what you preview is what you publish.

The public API is `src/index.ts` — depend on that, not internals. Architecture invariants and conventions live in the repo `CLAUDE.md`.
