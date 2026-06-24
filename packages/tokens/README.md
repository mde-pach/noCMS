# @nocms/tokens

The flat, one-token-per-line file is the source of truth. Parses it, compiles tokens to CSS custom properties (runtime theming, no rebuild), and generates nested W3C DTCG for interop (Style Dictionary, Tokens Studio, Penpot). Flat→DTCG, never the reverse.

The public API is `src/index.ts` — depend on that, not internals. Architecture invariants and conventions live in the repo `CLAUDE.md`.
