import type { ComponentChildren } from "preact";
import * as v from "valibot";

export const SectionSchema = v.object({
  tone: v.optional(v.picklist(["default", "muted", "accent"]), "default"),
  padding: v.optional(v.picklist(["sm", "md", "lg"]), "lg"),
});

export type SectionProps = v.InferInput<typeof SectionSchema> & {
  children?: ComponentChildren;
};

const TONE_BG = {
  default: "transparent",
  muted: "color-mix(in srgb, var(--color-text) 4%, transparent)",
  accent: "var(--color-brand-500)",
} as const;

// A full-bleed vertical band — the unit pages are assembled from.
export function Section({ tone = "default", padding = "lg", children }: SectionProps) {
  return (
    <section
      class={`section section-${tone}`}
      style={{ background: TONE_BG[tone], paddingBlock: `var(--space-${padding})` }}
    >
      {children}
    </section>
  );
}
