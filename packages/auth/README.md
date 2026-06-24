# @nocms/auth

Client-side GitHub App sign-in with PKCE (S256) and short-lived rotating tokens (8h user / 6mo refresh). Talks to the stateless relay only for code↔token exchange and refresh. PAT fallback for zero relay dependency. The token never reaches plugin code.

The public API is `src/index.ts` — depend on that, not internals. Architecture invariants and conventions live in the repo `CLAUDE.md`.
