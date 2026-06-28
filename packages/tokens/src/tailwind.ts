import { cssVarName } from "./css";
import type { Token } from "./types";

// noCMS token namespaces → Tailwind v4 theme-key namespaces. Only the names differ (`space` is
// Tailwind's `spacing`); everything else is identity.
const NAMESPACE: Record<string, string> = { space: "spacing" };

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
export function toTailwindTheme(tokens: Token[]): string {
  const decls = tokens.map((token) => {
    const parts = token.name.split(".");
    const head = parts[0] ?? "";
    const namespace = NAMESPACE[head] ?? head;
    return `  --${namespace}-${parts.slice(1).join("-")}: var(${cssVarName(token.name)});`;
  });
  return `@theme inline {\n${decls.join("\n")}\n}\n`;
}
