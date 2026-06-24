# @nocms/editor

The in-site, per-site editor: WYSIWYG over MDX, visual layout composition, and live CSS-variable token theming. Ships with the site; never a hosted studio. Reuses the runtime renderer as the canvas. Heavy preview compilation (WASM) loads only here.

The public API is `src/index.ts` — depend on that, not internals. Architecture invariants and conventions live in the repo `CLAUDE.md`.
