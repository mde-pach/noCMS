import type { ComponentChildren } from "preact";
import * as v from "valibot";

// Sections pick a background by token *role*, not a raw color, so a theme swap restyles every
// band coherently. Only the real color tokens (brand-500, text, bg) are referenced;
// muted/surface are mixed from them, never hardcoded.
export const SURFACE_ROLES = ["page", "surface", "subtle", "brand"] as const;
export type SurfaceRole = (typeof SURFACE_ROLES)[number];

export const surfaceFor: Record<SurfaceRole, string> = {
  page: "var(--color-bg)",
  surface: "color-mix(in srgb, var(--color-text) 4%, var(--color-bg))",
  subtle: "color-mix(in srgb, var(--color-text) 7%, var(--color-bg))",
  brand: "var(--color-brand-500)",
};

// Readable foreground for each surface; on `brand` the page bg reads as on-primary.
export const onSurfaceFor: Record<SurfaceRole, string> = {
  page: "var(--color-text)",
  surface: "var(--color-text)",
  subtle: "var(--color-text)",
  brand: "var(--color-bg)",
};

/** Secondary text: the current foreground, dimmed — works on any surface. */
export const mutedInk = "color-mix(in srgb, currentColor 65%, transparent)";

/** Hairline border tinted from the current foreground. */
export const hairline = "1px solid color-mix(in srgb, currentColor 14%, transparent)";

export const surfaceField = (role: SurfaceRole) =>
  v.optional(v.pipe(v.picklist(SURFACE_ROLES), v.metadata({ control: "color" })), role);

export const richText = () => v.pipe(v.string(), v.metadata({ control: "richtext" }));

export const optionalRichText = (fallback?: string) =>
  fallback === undefined ? v.optional(richText()) : v.optional(richText(), fallback);

export const linkField = (href = "#") =>
  v.optional(v.pipe(v.string(), v.metadata({ control: "url" })), href);

export const imageField = () =>
  v.optional(v.pipe(v.string(), v.metadata({ control: "image" })));

const PAD = {
  sm: "var(--space-lg)",
  md: "var(--space-xl)",
  lg: "var(--space-xl)",
} as const;

interface BandProps {
  background?: SurfaceRole;
  /** Vertical rhythm of the band; `lg` is heavier, for hero-weight sections. */
  size?: keyof typeof PAD;
  children?: ComponentChildren;
}

export function Band({ background = "page", size = "md", children }: BandProps) {
  return (
    <section
      class={`band band-${background}`}
      style={{
        background: surfaceFor[background],
        color: onSurfaceFor[background],
        paddingBlock: size === "lg" ? "calc(var(--space-xl) * 1.5)" : PAD[size],
      }}
    >
      {children}
    </section>
  );
}
