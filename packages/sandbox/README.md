# @nocms/sandbox

The plugin/extension security boundary. Hosts untrusted plugin code in a sandboxed iframe (UI) + isolated VM (logic), reachable only through a capability-scoped postMessage API. Plugins never touch the raw token, host DOM, or network by default. Declared permissions + owner consent + integrity-pinned distribution.

The public API is `src/index.ts` — depend on that, not internals. Architecture invariants and conventions live in the repo `CLAUDE.md`.
