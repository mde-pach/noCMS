# @nocms/props-discovery

Parses a component's TypeScript types to auto-derive editor controls — no annotation DSL. The type determines the control (string→text, literal-union→select, ReactNode→slot, handler→action-binding). Bridges parsed types with an optional thin field-config.

The public API is `src/index.ts` — depend on that, not internals. Architecture invariants and conventions live in the repo `CLAUDE.md`.
