/** One token. `name` is dotted (e.g. `color.brand.500`); `cssVarName` shapes it. */
export interface Token {
  name: string;
  value: string;
  /** per-breakpoint value overrides, keyed by breakpoint name */
  breakpoints?: Record<string, string>;
}
