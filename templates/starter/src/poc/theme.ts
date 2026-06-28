import { cssVarName, type Token } from "@nocms/tokens";

// noCMS token namespaces don't all match Tailwind's theme-key namespaces; only the names differ.
const TAILWIND_NAMESPACE: Record<string, string> = { space: "spacing" };

/**
 * Bridge the flat token file into a Tailwind v4 `@theme` so utilities exist for every token —
 * `color.brand.500` → `bg-brand-500`, `space.md` → `p-md`, `radius.md` → `rounded-md`.
 *
 * `@theme inline` with a `var(--…)` value is the load-bearing trick: the generated utility
 * resolves to noCMS's *runtime* variable (emitted by `toCssVariables`), not a Tailwind-owned copy.
 * So editing a token value stays a CSS-variable swap — no Tailwind recompile (invariant #3).
 */
export function toTailwindTheme(tokens: Token[]): string {
  const decls = tokens.map((token) => {
    const [head, ...rest] = token.name.split(".");
    const namespace = (head && TAILWIND_NAMESPACE[head]) || head;
    return `  --${namespace}-${rest.join("-")}: var(${cssVarName(token.name)});`;
  });
  return `@import "tailwindcss";\n@theme inline {\n${decls.join("\n")}\n}\n`;
}
