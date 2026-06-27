import type { Token } from "./types";
/** `color.brand.500` → `--color-brand-500` */
export declare function cssVarName(dotted: string): string;
/**
 * Compile tokens to CSS custom properties — the runtime theming path (invariant
 * #3: a token edit is a variable swap, never a rebuild). Base values land in
 * `:root`; each mode's `@mode` overrides land in a scoped `[data-theme="<mode>"]`
 * block, so flipping `data-theme` restyles instantly with no second render (D12).
 */
export declare function toCssVariables(tokens: Token[]): string;
