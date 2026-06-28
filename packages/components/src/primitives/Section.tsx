import type { ComponentChildren } from "preact";
import * as v from "valibot";
import { cx } from "../cx";

export const SectionSchema = v.object({
  tone: v.optional(v.picklist(["default", "muted", "accent"]), "default"),
  padding: v.optional(v.picklist(["sm", "md", "lg"]), "lg"),
});

export type SectionProps = v.InferInput<typeof SectionSchema> & {
  children?: ComponentChildren;
  class?: string;
  className?: string;
};

const TONE = {
  default: "bg-transparent",
  muted: "bg-text/4",
  accent: "bg-brand-500",
} as const;

export function Section({
  tone = "default",
  padding = "lg",
  children,
  class: cls,
  className,
}: SectionProps) {
  return (
    <section class={cx(TONE[tone], `py-${padding}`, className, cls)}>
      {children}
    </section>
  );
}
