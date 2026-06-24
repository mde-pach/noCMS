// Design tokens. The flat, one-token-per-line file is the source of truth
// (clean git line merges). Tokens compile to CSS custom properties so editing
// one restyles instantly with no rebuild; DTCG is generated from the flat
// source for interop, never the reverse.

export { cssVarName, toCssVariables } from "./css";
export { toDtcg } from "./dtcg";
export { formatTokens } from "./format";
export { parseTokens, TokenParseError } from "./parse";
export type { Token } from "./types";
