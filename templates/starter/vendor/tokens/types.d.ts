/** One token. `name` is dotted (e.g. `color.brand.500`); `cssVarName` shapes it. */
export interface Token {
    name: string;
    value: string;
    /** per-breakpoint value overrides, keyed by breakpoint name (`md`, `lg`) */
    breakpoints?: Record<string, string>;
    /** per-mode value overrides, keyed by mode name (`dark`); compiles to a scoped block (D12) */
    modes?: Record<string, string>;
}
