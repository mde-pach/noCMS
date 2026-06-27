import type { Token } from "./types";

/**
 * Inverse of `parseTokens`: `parseTokens(formatTokens(t))` is `t`. Emits each
 * token's base `name: value` line before its `name@<q>` overrides, because the
 * parser attaches an override to the base token it has already seen.
 */
export function formatTokens(tokens: Token[]): string {
  const lines: string[] = [];
  for (const token of tokens) {
    lines.push(`${token.name}: ${token.value}`);
    for (const [mode, value] of Object.entries(token.modes ?? {})) {
      lines.push(`${token.name}@${mode}: ${value}`);
    }
    for (const [breakpoint, value] of Object.entries(token.breakpoints ?? {})) {
      lines.push(`${token.name}@${breakpoint}: ${value}`);
    }
  }
  return `${lines.join("\n")}\n`;
}
