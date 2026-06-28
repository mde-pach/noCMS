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

// A complete starter theme — a default value of the flat source, not a second
// format; the flat one-token-per-line file stays canonical.
export const DEFAULT_TOKENS = `# Color roles — the named contract components bind to.
color.bg: #ffffff
color.bg@dark: #0b1120
color.surface: #f8fafc
color.surface@dark: #111827
color.text: #0f172a
color.text@dark: #f1f5f9
color.muted: #64748b
color.muted@dark: #94a3b8
color.primary: #2563eb
color.primary@dark: #60a5fa
color.on-primary: #ffffff
color.on-primary@dark: #0b1120
color.border: #e2e8f0
color.border@dark: #1e293b
color.accent: #7c3aed
color.accent@dark: #a78bfa

# Spacing ramp.
space.1: 0.25rem
space.2: 0.5rem
space.3: 1rem
space.4: 1.5rem
space.5: 2rem
space.6: 3rem

# Type-size ramp.
text.sm: 0.875rem
text.base: 1rem
text.lg: 1.25rem
text.xl: 1.5rem
text.2xl: 2rem

# Radius ramp.
radius.sm: 0.25rem
radius.md: 0.5rem
radius.lg: 1rem
radius.full: 9999px

# Shadow ramp.
shadow.sm: 0 1px 2px rgba(0, 0, 0, 0.06)
shadow.md: 0 4px 12px rgba(0, 0, 0, 0.1)
shadow.lg: 0 12px 32px rgba(0, 0, 0, 0.16)
`;
