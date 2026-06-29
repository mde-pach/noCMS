// The catalog is the full Tailwind surface reshaped into CSS *features* with typed controls —
// never raw class names. Coverage is the engine's; the user only ever sees design controls and
// human values. These types are the cross-boundary currency between the build-time catalog
// builder and the runtime control logic.

export type Control = "color" | "length" | "angle" | "number" | "enum";

export interface FeatureOption {
  cls: string;
  value: string;
  label: string;
  /** Numeric magnitude for ordering a scale by *size* (xs<sm<md<lg<xl), resolved from the token —
   * named values compile to `var(--spacing-md)`, which a leading-number sort can't order. */
  order: number;
}

export interface Feature {
  id: string;
  label: string;
  group: string;
  control: Control;
  /** The utility prefix (`bg-`, `rotate-`) — drives the arbitrary-value escape `prefix-[value]`;
   * empty for static/keyword utilities that take no value. */
  prefix: string;
  /** Every class that drives this property (no value-dedupe) — the basis for class→feature lookup,
   * so distinct utilities that share a value (`text-x` vs `placeholder-x`) are both resolvable. */
  classes: string[];
  options: FeatureOption[];
}

export interface ColorShade {
  shade: string | null;
  value: string;
  cls: string;
}

export interface ColorFamily {
  name: string;
  isToken: boolean;
  shades: ColorShade[];
}

export interface Catalog {
  total: number;
  features: Feature[];
  colors: ColorFamily[];
}
