import type { Token } from "./types";
/**
 * Inverse of `parseTokens`: `parseTokens(formatTokens(t))` is `t`. Emits each
 * token's base `name: value` line before its `name@<q>` overrides, because the
 * parser attaches an override to the base token it has already seen.
 */
export declare function formatTokens(tokens: Token[]): string;
