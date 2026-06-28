/** `name` is dotted, e.g. `color.brand.500`. */
export interface Token {
  name: string;
  value: string;
  breakpoints?: Record<string, string>;
  modes?: Record<string, string>;
}
