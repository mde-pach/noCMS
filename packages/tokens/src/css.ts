import type { Token } from "./types";

/** `color.brand.500` → `--color-brand-500` */
export function cssVarName(dotted: string): string {
  return dotted.startsWith("--") ? dotted : `--${dotted.replace(/\./g, "-")}`;
}

/** Compile base token values to a `:root { --… }` block — the runtime theming path. */
export function toCssVariables(tokens: Token[]): string {
  const decls = tokens.map((t) => `  ${cssVarName(t.name)}: ${t.value};`).join("\n");
  return `:root {\n${decls}\n}\n`;
}
