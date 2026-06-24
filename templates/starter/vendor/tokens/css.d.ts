import type { Token } from "./types";
/** `color.brand.500` → `--color-brand-500` */
export declare function cssVarName(dotted: string): string;
/** Compile base token values to a `:root { --… }` block — the runtime theming path. */
export declare function toCssVariables(tokens: Token[]): string;
