import type { Token } from "./types";
/** `color.brand.500` → `--color-brand-500` */
export declare function cssVarName(dotted: string): string;
/**
 * The runtime theming path: a token edit is a CSS-variable swap, never a rebuild.
 * Base values land in `:root`; each mode's `@mode` overrides land in a scoped
 * `[data-theme="<mode>"]` block, so flipping `data-theme` restyles with no re-render.
 */
export declare function toCssVariables(tokens: Token[]): string;
