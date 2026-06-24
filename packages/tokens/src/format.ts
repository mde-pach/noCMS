import type { Token } from "./types";

/**
 * Serialize tokens back to the flat, one-token-per-line source — the format git
 * line-merges. `parseTokens` is the inverse: `parseTokens(formatTokens(t))` is `t`.
 * Each token emits its base `name: value`, then a `name@bp: value` line per
 * breakpoint override (base first, so the parser attaches overrides to it).
 */
export function formatTokens(tokens: Token[]): string {
  const lines: string[] = [];
  for (const token of tokens) {
    lines.push(`${token.name}: ${token.value}`);
    for (const [breakpoint, value] of Object.entries(token.breakpoints ?? {})) {
      lines.push(`${token.name}@${breakpoint}: ${value}`);
    }
  }
  return `${lines.join("\n")}\n`;
}
