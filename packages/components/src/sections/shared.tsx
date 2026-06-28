import type { ComponentChildren } from "preact";
import * as v from "valibot";
import { cx } from "../cx";

// Sections pick a background by token *role*, not a raw color, so a theme swap restyles every
// band coherently. Only the real color tokens (brand-500, text, bg) are referenced;
// muted/surface are mixed from them, never hardcoded.
export const SURFACE_ROLES = ["page", "surface", "subtle", "brand"] as const;
export type SurfaceRole = (typeof SURFACE_ROLES)[number];

export const surfaceBg: Record<SurfaceRole, string> = {
  page: "bg-bg",
  surface: "bg-[color-mix(in_srgb,var(--color-text)_4%,var(--color-bg))]",
  subtle: "bg-[color-mix(in_srgb,var(--color-text)_7%,var(--color-bg))]",
  brand: "bg-brand-500",
};

// Readable foreground for each surface; on `brand` the page bg reads as on-primary.
export const surfaceText: Record<SurfaceRole, string> = {
  page: "text-text",
  surface: "text-text",
  subtle: "text-text",
  brand: "text-bg",
};

/** Secondary text: the current foreground, dimmed — works on any surface. */
export const mutedInk = "text-current/65";

/** Hairline border tinted from the current foreground (full box / top edge). */
export const hairline = "border border-current/14";
export const hairlineTop = "border-t border-t-current/14";

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
  sm: "py-lg",
  md: "py-xl",
  lg: "py-[calc(var(--space-xl)*1.5)]",
} as const;

interface BandProps {
  background?: SurfaceRole;
  /** Vertical rhythm of the band; `lg` is heavier, for hero-weight sections. */
  size?: keyof typeof PAD;
  children?: ComponentChildren;
  class?: string;
  className?: string;
}

export function Band({
  background = "page",
  size = "md",
  children,
  class: cls,
  className,
}: BandProps) {
  return (
    <section
      class={cx(
        surfaceBg[background],
        surfaceText[background],
        PAD[size],
        className,
        cls,
      )}
    >
      {children}
    </section>
  );
}
