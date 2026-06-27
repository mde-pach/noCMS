import type { ComponentChildren } from "preact";
import * as v from "valibot";

export const HeroSchema = v.object({
  title: v.string(),
  subtitle: v.optional(v.string()),
});

export type HeroProps = v.InferInput<typeof HeroSchema> & {
  children?: ComponentChildren;
};

export function Hero({ title, subtitle, children }: HeroProps) {
  return (
    <section style={{ padding: "var(--space-lg) 0" }}>
      <h1 style={{ fontFamily: "var(--font-heading)" }}>{title}</h1>
      {subtitle ? <p style={{ opacity: 0.8 }}>{subtitle}</p> : null}
      {children}
    </section>
  );
}
