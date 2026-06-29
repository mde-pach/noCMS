// The named roles + ramps every component binds to, never raw palette — so
// editing one role restyles every component bound to it.

export const COLOR_ROLES = [
  "bg",
  "surface",
  "text",
  "muted",
  "primary",
  "on-primary",
  "border",
  "accent",
] as const;
export type ColorRole = (typeof COLOR_ROLES)[number];

/** Ramps are mode-invariant — never `@mode` qualified. */
export const RAMPS = {
  space: ["1", "2", "3", "4", "5", "6"],
  text: ["sm", "base", "lg", "xl", "2xl"],
  radius: ["sm", "md", "lg", "full"],
  shadow: ["sm", "md", "lg"],
} as const satisfies Record<string, readonly string[]>;
export type RampName = keyof typeof RAMPS;

// Theme modes that may carry a `@mode` override in the flat file. Only color
// (and shadow) roles vary by mode; ramps don't. The qualifier in `name@<q>: v`
// is read as a mode when `<q>` is one of these, otherwise as a breakpoint — so
// `color.primary@dark` is a mode and `space.3@md` is a breakpoint, no collision.
export const MODES = ["dark"] as const;
export type Mode = (typeof MODES)[number];
const MODE_SET = new Set<string>(MODES);
export function isMode(qualifier: string): qualifier is Mode {
  return MODE_SET.has(qualifier);
}

export function contractTokenNames(): string[] {
  const names = COLOR_ROLES.map((role) => `color.${role}`);
  for (const [ramp, steps] of Object.entries(RAMPS)) {
    for (const step of steps) names.push(`${ramp}.${step}`);
  }
  return names;
}

export function missingContractTokens(tokens: { name: string }[]): string[] {
  const present = new Set(tokens.map((t) => t.name));
  return contractTokenNames().filter((name) => !present.has(name));
}
