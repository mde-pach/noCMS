/** Color roles. A component `color` control binds to one of these, so a theme swap is global. */
export declare const COLOR_ROLES: readonly ["bg", "surface", "text", "muted", "primary", "on-primary", "border", "accent"];
export type ColorRole = (typeof COLOR_ROLES)[number];
/** Ordered ramps components reference by step. Ramps are mode-invariant — never `@mode` qualified. */
export declare const RAMPS: {
    readonly space: readonly ["1", "2", "3", "4", "5", "6"];
    readonly text: readonly ["sm", "base", "lg", "xl", "2xl"];
    readonly radius: readonly ["sm", "md", "lg", "full"];
    readonly shadow: readonly ["sm", "md", "lg"];
};
export type RampName = keyof typeof RAMPS;
export declare const MODES: readonly ["dark"];
export type Mode = (typeof MODES)[number];
export declare function isMode(qualifier: string): qualifier is Mode;
/** Every canonical token name the contract requires: `color.<role>` and `<ramp>.<step>`. */
export declare function contractTokenNames(): string[];
/** Contract token names absent from `tokens` — empty means the theme is complete. */
export declare function missingContractTokens(tokens: {
    name: string;
}[]): string[];
/**
 * A clean neutral starter theme: a complete role + ramp assignment, with `@dark`
 * variants on the colors. The flat one-token-per-line source stays canonical
 * (invariant #5); this is a default value of it, not a second format.
 */
export declare const DEFAULT_TOKENS = "# Color roles \u2014 the named contract components bind to.\ncolor.bg: #ffffff\ncolor.bg@dark: #0b1120\ncolor.surface: #f8fafc\ncolor.surface@dark: #111827\ncolor.text: #0f172a\ncolor.text@dark: #f1f5f9\ncolor.muted: #64748b\ncolor.muted@dark: #94a3b8\ncolor.primary: #2563eb\ncolor.primary@dark: #60a5fa\ncolor.on-primary: #ffffff\ncolor.on-primary@dark: #0b1120\ncolor.border: #e2e8f0\ncolor.border@dark: #1e293b\ncolor.accent: #7c3aed\ncolor.accent@dark: #a78bfa\n\n# Spacing ramp.\nspace.1: 0.25rem\nspace.2: 0.5rem\nspace.3: 1rem\nspace.4: 1.5rem\nspace.5: 2rem\nspace.6: 3rem\n\n# Type-size ramp.\ntext.sm: 0.875rem\ntext.base: 1rem\ntext.lg: 1.25rem\ntext.xl: 1.5rem\ntext.2xl: 2rem\n\n# Radius ramp.\nradius.sm: 0.25rem\nradius.md: 0.5rem\nradius.lg: 1rem\nradius.full: 9999px\n\n# Shadow ramp.\nshadow.sm: 0 1px 2px rgba(0, 0, 0, 0.06)\nshadow.md: 0 4px 12px rgba(0, 0, 0, 0.1)\nshadow.lg: 0 12px 32px rgba(0, 0, 0, 0.16)\n";
