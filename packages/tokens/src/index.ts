// Design tokens. The flat, one-token-per-line file is the source of truth
// (clean git line merges). Tokens compile to CSS custom properties so editing
// one restyles instantly with no rebuild; DTCG is generated from the flat
// source for interop, never the reverse.

export { cssVarName, toCssVariables } from "./css";
export { toDtcg } from "./dtcg";
export { formatTokens } from "./format";
export { parseTokens, TokenParseError } from "./parse";
export type { ColorRole, Mode, RampName } from "./roles";
export {
  COLOR_ROLES,
  contractTokenNames,
  DEFAULT_TOKENS,
  isMode,
  MODES,
  missingContractTokens,
  RAMPS,
} from "./roles";
export type { Token } from "./types";
