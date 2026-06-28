import type { Token } from "./types";
/**
 * Generate a Tailwind v4 `@theme` block from the flat tokens, so every token gains utilities:
 * `color.primary` → `bg-primary`/`text-primary`, `space.3` → `p-3`, `radius.md` → `rounded-md`.
 * Like DTCG, this is a *generated* interop format — the flat file stays the source (invariant #5).
 *
 * `@theme inline` with a `var(--…)` value is load-bearing: the generated utility resolves to the
 * token's runtime CSS variable (the one `toCssVariables` emits), not a Tailwind-owned copy — so a
 * token edit stays a CSS-variable swap, never a Tailwind recompile (invariant #3). Consumers prepend
 * `@import "tailwindcss";` to feed it to the engine (browser or CLI).
 */
export declare function toTailwindTheme(tokens: Token[]): string;
