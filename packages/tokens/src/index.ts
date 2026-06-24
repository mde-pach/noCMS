// Design tokens. The flat, one-token-per-line file is the source of truth
// (clean git line merges). Tokens compile to CSS custom properties so editing
// one restyles instantly with no rebuild; DTCG is generated from the flat
// source for interop, never the reverse.

/** One token. `name` is CSS-custom-property-shaped after `parseTokens`. */
export interface Token {
  /** e.g. `color.brand.500` or `--color-brand-500` */
  name: string;
  value: string;
  /** per-breakpoint overrides for responsive editing */
  breakpoints?: Record<string, string>;
}

export function parseTokens(_source: string): Token[] {
  throw new Error("not implemented: parse flat token source");
}

/** Compile to a `:root { --… }` block — the runtime theming path. */
export function toCssVariables(tokens: Token[]): string {
  const decls = tokens
    .map(
      (t) => `  ${t.name.startsWith("--") ? t.name : cssVarName(t.name)}: ${t.value};`,
    )
    .join("\n");
  return `:root {\n${decls}\n}\n`;
}

/** `color.brand.500` → `--color-brand-500` */
export function cssVarName(dotted: string): string {
  return `--${dotted.replace(/\./g, "-")}`;
}

/** Nested W3C DTCG generated from the flat source, for tooling interop only. */
export function toDtcg(_tokens: Token[]): Record<string, unknown> {
  throw new Error("not implemented: generate DTCG from flat tokens");
}
